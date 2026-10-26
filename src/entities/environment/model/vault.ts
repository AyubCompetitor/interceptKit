import {
    createSalt,
    decryptText,
    deriveKeyBytes,
    encodedKey,
    encodedSalt,
    encryptedValue,
    encryptText,
    number,
    object,
    optional,
    type EncryptedValue,
    type Validator,
} from '#shared/lib';

import { isEncryptedValue, type Environment, type EnvVariable } from './environment.ts';

/** How the key of the vault comes out of the master password */
export interface VaultKeyParams {
    /** Base64 of the random PBKDF2 salt */
    readonly salt: string;
    /** PBKDF2-SHA256 rounds the key was derived with */
    readonly iterations: number;
    /** A known text encrypted with the key: only the right password opens it */
    readonly check: EncryptedValue;
}

/** Encryption of secret values with a master password */
export interface Vault {
    /** Set while the vault is on */
    readonly keyParams?: VaultKeyParams;
}

/** The key of the unlocked vault; only the background reads it */
export interface VaultKey {
    /** Base64 of the raw AES-GCM key; none while the vault is locked */
    readonly bytes?: string;
}

/** What the pages see of the unlocked vault */
export interface VaultStatus {
    /** When the vault locks itself unless it is used again, in milliseconds since the epoch; none while locked */
    readonly unlockedUntil?: number;
}

/** A new vault with its key */
export interface CreatedVault {
    /** What the vault keeps to open the key again */
    readonly keyParams: VaultKeyParams;
    /** The key itself */
    readonly keyBytes: string;
}

/** The decrypted value of a secret variable */
export interface SecretValue {
    /** Name of the variable */
    readonly key: string;
    /** Its value */
    readonly value: string;
}

export enum VaultStates {
    /** Secrets are stored as typed */
    OFF = 'off',
    /** Secrets are encrypted and cannot be used until the master password is entered */
    LOCKED = 'locked',
    /** Secrets are encrypted, and the background holds the key */
    UNLOCKED = 'unlocked',
}

export type VaultState = `${VaultStates}`;

/** A variable whose value is encrypted */
interface EncryptedVariable extends EnvVariable {
    /** The encrypted value */
    readonly value: EncryptedValue;
}

const VAULT_CHECK_TEXT = 'xrequest-vault';

/** Fewer rounds would make guessing the password cheap; more would freeze unlocking */
const KEY_ITERATION_LIMITS = {
    MIN: 100_000,
    MAX: 10_000_000,
} as const;

const vaultKeyParams = object({
    salt: encodedSalt,
    iterations: number({ integer: true, min: KEY_ITERATION_LIMITS.MIN, max: KEY_ITERATION_LIMITS.MAX }),
    check: encryptedValue,
});

export const vaultValidator: Validator<Vault> = object({ keyParams: optional(vaultKeyParams) });

export const vaultKeyValidator: Validator<VaultKey> = object({ bytes: optional(encodedKey) });

export const vaultStatusValidator: Validator<VaultStatus> = object({
    unlockedUntil: optional(number({ integer: true, min: 0 })),
});

export const getVaultState = (vault: Vault, status: VaultStatus): VaultState => {
    if (!vault.keyParams) {
        return VaultStates.OFF;
    }

    if (status.unlockedUntil === undefined) {
        return VaultStates.LOCKED;
    }

    return VaultStates.UNLOCKED;
};

export const createVaultKey = async (password: string, iterations: number): Promise<CreatedVault> => {
    const salt = createSalt();
    const keyBytes = await deriveKeyBytes(password, salt, iterations);
    const check = await encryptText(keyBytes, VAULT_CHECK_TEXT);

    return {
        keyParams: {
            salt,
            iterations,
            check,
        },
        keyBytes,
    };
};

const isCheckOpened = async (keyBytes: string, check: EncryptedValue): Promise<boolean> => {
    try {
        const text = await decryptText(keyBytes, check);

        return text === VAULT_CHECK_TEXT;
    } catch {
        return false;
    }
};

/** The key the password opens; none for a wrong password */
export const openVaultKey = async (password: string, keyParams: VaultKeyParams): Promise<NotRequired<string>> => {
    const keyBytes = await deriveKeyBytes(password, keyParams.salt, keyParams.iterations);
    const isPasswordRight = await isCheckOpened(keyBytes, keyParams.check);

    if (!isPasswordRight) {
        return;
    }

    return keyBytes;
};

/** A typed secret waits to be encrypted, and an encrypted value of a variable that is no longer secret waits to be opened */
const isSealPending = (variable: EnvVariable): boolean => {
    const isEmptySecret = variable.secret && variable.value === '';

    if (isEmptySecret) {
        return false;
    }

    return variable.secret !== isEncryptedValue(variable.value);
};

export const isEnvironmentSealed = (environment: Environment): boolean => !environment.variables.some(isSealPending);

const sealVariable = async (variable: EnvVariable, keyBytes: string): Promise<EnvVariable> => {
    if (!isSealPending(variable)) {
        return variable;
    }

    if (isEncryptedValue(variable.value)) {
        return {
            ...variable,
            value: await decryptText(keyBytes, variable.value),
        };
    }

    return {
        ...variable,
        value: await encryptText(keyBytes, variable.value),
    };
};

/** Brings the values in line with the secret flags: secrets encrypted, everything else as typed */
export const sealEnvironment = async (environment: Environment, keyBytes: string): Promise<Environment> => ({
    ...environment,
    variables: await Promise.all(environment.variables.map(variable => sealVariable(variable, keyBytes))),
});

const openVariable = async (variable: EnvVariable, keyBytes: string): Promise<EnvVariable> => {
    if (!isEncryptedValue(variable.value)) {
        return variable;
    }

    return {
        ...variable,
        value: await decryptText(keyBytes, variable.value),
    };
};

/** Every value as typed, for a vault that is turned off */
export const decryptEnvironment = async (environment: Environment, keyBytes: string): Promise<Environment> => ({
    ...environment,
    variables: await Promise.all(environment.variables.map(variable => openVariable(variable, keyBytes))),
});

export const resealEnvironment = async (
    environment: Environment,
    oldKeyBytes: string,
    newKeyBytes: string,
): Promise<Environment> => {
    const decrypted = await decryptEnvironment(environment, oldKeyBytes);

    return sealEnvironment(decrypted, newKeyBytes);
};

const dropEncryptedValue = (variable: EnvVariable): EnvVariable => {
    if (!isEncryptedValue(variable.value)) {
        return variable;
    }

    return {
        ...variable,
        value: '',
    };
};

/** Without the key the encrypted values are lost: their variables stay, empty, to be filled in again */
export const dropEncryptedValues = (environment: Environment): Environment => ({
    ...environment,
    variables: environment.variables.map(dropEncryptedValue),
});

const isTypedSecret = (variable: EnvVariable): boolean =>
    variable.secret && !isEncryptedValue(variable.value) && variable.value !== '';

export const getTypedSecretNames = (environment: NotRequired<Environment>): string[] => {
    const names: string[] = [];

    for (const variable of environment?.variables ?? []) {
        if (!isTypedSecret(variable)) {
            continue;
        }

        names.push(variable.key);
    }

    return names;
};

const isUsableSecret = (variable: EnvVariable): variable is EncryptedVariable =>
    variable.enabled && isEncryptedValue(variable.value);

/** Names of the switched-on variables whose values only the unlocked vault opens; every send asks for them */
export const getEncryptedNames = (environment: NotRequired<Environment>): string[] => {
    const names: string[] = [];

    for (const variable of environment?.variables ?? []) {
        if (!isUsableSecret(variable)) {
            continue;
        }

        names.push(variable.key);
    }

    return names;
};

/** A value that does not open with the key is left out */
const revealVariable = async (variable: EncryptedVariable, keyBytes: string): Promise<SecretValue[]> => {
    try {
        const value = await decryptText(keyBytes, variable.value);

        return [
            {
                key: variable.key,
                value,
            },
        ];
    } catch {
        return [];
    }
};

export const revealSecrets = async (environment: Environment, keyBytes: string): Promise<SecretValue[]> => {
    const reveals: Promise<SecretValue[]>[] = [];

    for (const variable of environment.variables) {
        if (!isUsableSecret(variable)) {
            continue;
        }

        reveals.push(revealVariable(variable, keyBytes));
    }

    const revealed = await Promise.all(reveals);

    return revealed.flat();
};
