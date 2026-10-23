import {
    createVaultKey,
    decryptEnvironment,
    dropEncryptedValues,
    environmentsItem,
    findEnvironment,
    openVaultKey,
    revealSecrets,
    sealEnvironment,
    vaultItem,
    vaultRpc,
    type EnvironmentIdParams,
    type RevealedSecrets,
    type Vault,
    type VaultPasswordParams,
} from '#entities/environment';
import { VAULT_CONFIG } from '#shared/config';
import type { TaskQueue } from '#shared/lib';
import { RpcError, RpcErrorCodes, type Router } from '#shared/messaging';
import { readItem, writeItem } from '#shared/platform';

import { lockVault, readKeyParams, readVaultKey, takeVaultKey, unlockVault } from './vaultKey.ts';

const VAULT_ERRORS = {
    ALREADY_ON: 'the vault is on already',
    UNKNOWN_ENVIRONMENT: 'there is no environment with this id',
} as const;

const NO_VAULT: Vault = {};

/** The vault config goes first: if the worker stops halfway, secrets stay as typed and are sealed on the next save */
const createVaultHandler = async ({ password }: VaultPasswordParams, storageReady: Promise<void>): Promise<void> => {
    await storageReady;

    const vault = await readItem(vaultItem);

    if (vault.keyParams) {
        throw new RpcError(RpcErrorCodes.BAD_REQUEST, VAULT_ERRORS.ALREADY_ON);
    }

    const { keyParams, keyBytes } = await createVaultKey(password, VAULT_CONFIG.KEY_ITERATIONS);
    const environments = await readItem(environmentsItem);

    const sealedEnvironments = await Promise.all(
        environments.map(environment => sealEnvironment(dropEncryptedValues(environment), keyBytes)),
    );

    await writeItem(vaultItem, { keyParams });
    await writeItem(environmentsItem, sealedEnvironments);
    await unlockVault(keyBytes);
};

/** A wrong password is an answer, not an error */
const unlockVaultHandler = async ({ password }: VaultPasswordParams, storageReady: Promise<void>): Promise<boolean> => {
    await storageReady;

    const keyParams = await readKeyParams();
    const keyBytes = await openVaultKey(password, keyParams);

    if (keyBytes === undefined) {
        return false;
    }

    await unlockVault(keyBytes);

    return true;
};

const touchVaultHandler = async (): Promise<void> => {
    const keyBytes = await readVaultKey();

    if (keyBytes === undefined) {
        return;
    }

    await unlockVault(keyBytes);
};

const revealSecretsHandler = async (
    { id }: EnvironmentIdParams,
    storageReady: Promise<void>,
): Promise<RevealedSecrets> => {
    await storageReady;

    const keyBytes = await takeVaultKey();
    const environments = await readItem(environmentsItem);
    const environment = findEnvironment(environments, id);

    if (!environment) {
        throw new RpcError(RpcErrorCodes.BAD_REQUEST, VAULT_ERRORS.UNKNOWN_ENVIRONMENT);
    }

    return {
        secrets: await revealSecrets(environment, keyBytes),
    };
};

/** Asks for the password again: an unlocked vault left unattended must not be turned off by someone else */
const disableVaultHandler = async (
    { password }: VaultPasswordParams,
    storageReady: Promise<void>,
): Promise<boolean> => {
    await storageReady;

    const keyParams = await readKeyParams();
    const keyBytes = await openVaultKey(password, keyParams);

    if (keyBytes === undefined) {
        return false;
    }

    const environments = await readItem(environmentsItem);
    const decryptedEnvironments = await Promise.all(
        environments.map(environment => decryptEnvironment(environment, keyBytes)),
    );

    await writeItem(environmentsItem, decryptedEnvironments);
    await writeItem(vaultItem, NO_VAULT);
    await lockVault();

    return true;
};

/** For a forgotten password: the encrypted values are lost, their variables stay empty */
const resetVaultHandler = async (storageReady: Promise<void>): Promise<void> => {
    await storageReady;

    const environments = await readItem(environmentsItem);

    await writeItem(environmentsItem, environments.map(dropEncryptedValues));
    await writeItem(vaultItem, NO_VAULT);
    await lockVault();
};

export const registerVaultHandlers = (router: Router, storageReady: Promise<void>, enqueue: TaskQueue): void => {
    router.on(vaultRpc.create, params => enqueue(() => createVaultHandler(params, storageReady)));
    router.on(vaultRpc.unlock, params => enqueue(() => unlockVaultHandler(params, storageReady)));
    router.on(vaultRpc.lock, () => enqueue(lockVault));
    router.on(vaultRpc.touch, () => enqueue(touchVaultHandler));
    router.on(vaultRpc.reveal, params => enqueue(() => revealSecretsHandler(params, storageReady)));
    router.on(vaultRpc.disable, params => enqueue(() => disableVaultHandler(params, storageReady)));
    router.on(vaultRpc.reset, () => enqueue(() => resetVaultHandler(storageReady)));
};
