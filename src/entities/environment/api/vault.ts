import {
    vaultKeyValidator,
    vaultStatusValidator,
    vaultValidator,
    type SecretValue,
    type Vault,
    type VaultKey,
    type VaultStatus,
} from '../model/vault.ts';

import { VAULT_CONFIG } from '#shared/config';
import { defineMethod, defineStoreItem, identifier, nothing, object, Stores, string } from '#shared/lib';

import type { EnvironmentIdParams } from './environments.ts';

export interface VaultPasswordParams {
    /** The master password */
    readonly password: string;
}

export interface VaultPasswordChangeParams {
    /** The master password now */
    readonly password: string;
    /** The master password from now on */
    readonly newPassword: string;
}

/** The decrypted secrets of an environment */
export interface RevealedSecrets {
    /** Values of its switched-on encrypted variables */
    readonly secrets: readonly SecretValue[];
}

/** The browser wakes the background with it once the vault has been idle long enough */
export const VAULT_LOCK_ALARM = 'vault-lock';

const MAX_PASSWORD_LENGTH = 1024;

const currentPassword = string({ minLength: 1, maxLength: MAX_PASSWORD_LENGTH });

const newPassword = string({ minLength: VAULT_CONFIG.MIN_PASSWORD_LENGTH, maxLength: MAX_PASSWORD_LENGTH });

const vaultPassword = object({ password: currentPassword });

const newVaultPassword = object({ password: newPassword });

const vaultPasswordChange = object({
    password: currentPassword,
    newPassword,
});

export const vaultItem = defineStoreItem<Vault>({
    key: 'vault',
    area: Stores.LOCAL,
    fallback: {},
    validator: vaultValidator,
});

/** Lives in memory only and is gone when the browser closes */
export const vaultKeyItem = defineStoreItem<VaultKey>({
    key: 'vaultKey',
    area: Stores.SESSION,
    fallback: {},
    validator: vaultKeyValidator,
});

export const vaultStatusItem = defineStoreItem<VaultStatus>({
    key: 'vaultStatus',
    area: Stores.SESSION,
    fallback: {},
    validator: vaultStatusValidator,
});

/** The key never leaves the background: pages get only the values of the environment they send with */
export const vaultRpc = {
    create: defineMethod<VaultPasswordParams, void>('vault/create', newVaultPassword),
    unlock: defineMethod<VaultPasswordParams, boolean>('vault/unlock', vaultPassword),
    lock: defineMethod<null, void>('vault/lock', nothing),
    touch: defineMethod<null, void>('vault/touch', nothing),
    reveal: defineMethod<EnvironmentIdParams, RevealedSecrets>('vault/reveal', object({ id: identifier })),
    changePassword: defineMethod<VaultPasswordChangeParams, boolean>('vault/changePassword', vaultPasswordChange),
    disable: defineMethod<VaultPasswordParams, boolean>('vault/disable', vaultPassword),
    reset: defineMethod<null, void>('vault/reset', nothing),
} as const;
