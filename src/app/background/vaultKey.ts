import {
    dropEncryptedValues,
    getTypedSecretNames,
    isEnvironmentSealed,
    sealEnvironment,
    VAULT_LOCK_ALARM,
    vaultItem,
    vaultKeyItem,
    vaultStatusItem,
    type Environment,
    type VaultKey,
    type VaultKeyParams,
    type VaultStatus,
} from '#entities/environment';
import { isVaultRequired } from '#features/policy';
import { VAULT_CONFIG } from '#shared/config';
import type { TaskQueue } from '#shared/lib';
import { RpcError, RpcErrorCodes } from '#shared/messaging';
import { clearAlarm, readItem, scheduleAlarm, watchAlarm, writeItem } from '#shared/platform';

import { readManagedPolicy } from './managedPolicy.ts';

const VAULT_ERRORS = {
    OFF: 'the vault is off',
    LOCKED: 'the vault is locked',
    REQUIRED: 'the policy requires secrets to be encrypted',
} as const;

const NO_KEY: VaultKey = {};

const NO_STATUS: VaultStatus = {};

/** Keeps the key for the idle time; every use of the vault calls it again */
export const unlockVault = async (keyBytes: string): Promise<void> => {
    const unlockedUntil = Date.now() + VAULT_CONFIG.AUTO_LOCK_MS;

    await writeItem(vaultKeyItem, { bytes: keyBytes });
    await writeItem(vaultStatusItem, { unlockedUntil });
    await scheduleAlarm(VAULT_LOCK_ALARM, unlockedUntil);
};

export const lockVault = async (): Promise<void> => {
    await writeItem(vaultStatusItem, NO_STATUS);
    await writeItem(vaultKeyItem, NO_KEY);
    await clearAlarm(VAULT_LOCK_ALARM);
};

export const readKeyParams = async (): Promise<VaultKeyParams> => {
    const { keyParams } = await readItem(vaultItem);

    if (!keyParams) {
        throw new RpcError(RpcErrorCodes.BAD_REQUEST, VAULT_ERRORS.OFF);
    }

    return keyParams;
};

/** The alarm can come late, so an unlock that ran out is wiped right here */
export const readVaultKey = async (): Promise<NotRequired<string>> => {
    const { unlockedUntil } = await readItem(vaultStatusItem);

    const isUnlocked = unlockedUntil !== undefined && unlockedUntil > Date.now();

    if (!isUnlocked) {
        await lockVault();

        return;
    }

    const { bytes } = await readItem(vaultKeyItem);

    return bytes;
};

/** The key for a task that cannot go without it; the use moves the auto-lock further */
export const takeVaultKey = async (): Promise<string> => {
    const keyBytes = await readVaultKey();

    if (keyBytes === undefined) {
        throw new RpcError(RpcErrorCodes.FORBIDDEN, VAULT_ERRORS.LOCKED);
    }

    await unlockVault(keyBytes);

    return keyBytes;
};

const prepareWithoutVault = async (environment: Environment): Promise<Environment> => {
    const policy = await readManagedPolicy();

    const isTypedSecretRefused = isVaultRequired(policy) && !!getTypedSecretNames(environment).length;

    if (isTypedSecretRefused) {
        throw new RpcError(RpcErrorCodes.FORBIDDEN, VAULT_ERRORS.REQUIRED);
    }

    return dropEncryptedValues(environment);
};

export const prepareEnvironment = async (environment: Environment): Promise<Environment> => {
    const { keyParams } = await readItem(vaultItem);

    if (!keyParams) {
        return prepareWithoutVault(environment);
    }

    if (isEnvironmentSealed(environment)) {
        return environment;
    }

    const keyBytes = await takeVaultKey();

    return sealEnvironment(environment, keyBytes);
};

/** Wipes an unlock that ran out, or makes sure its alarm is set */
const lockExpiredVault = async (): Promise<void> => {
    const { unlockedUntil } = await readItem(vaultStatusItem);

    const isUnlocked = unlockedUntil !== undefined && unlockedUntil > Date.now();

    if (!isUnlocked) {
        await lockVault();

        return;
    }

    await scheduleAlarm(VAULT_LOCK_ALARM, unlockedUntil);
};

export const startVaultLock = (enqueue: TaskQueue): void => {
    const requestLock: VoidFunction = () => {
        enqueue(lockExpiredVault).catch((error: unknown) => console.error('[vault] auto-lock failed', error));
    };

    watchAlarm(VAULT_LOCK_ALARM, requestLock);

    requestLock();
};
