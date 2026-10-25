import { VaultStates, type Environment, type EnvVariable, type VaultState } from '#entities/environment';

/** What happens to the secret values of a file, by the same rules as typing them in the editor */
export enum ImportSecretModes {
    /** Stored as typed: the vault is off */
    PLAIN = 'plain',
    /** Encrypted by the background: the vault is unlocked */
    ENCRYPTED = 'encrypted',
    /** Left empty: the vault is locked */
    LOCKED = 'locked',
    /** Left empty: the policy requires the vault, and it is off */
    REQUIRED = 'required',
}

export type ImportSecretMode = `${ImportSecretModes}`;

const KEPT_SECRET_MODES: readonly ImportSecretMode[] = [ImportSecretModes.PLAIN, ImportSecretModes.ENCRYPTED];

export const getImportSecretMode = (vaultState: VaultState, isVaultRequired: boolean): ImportSecretMode => {
    if (vaultState === VaultStates.UNLOCKED) {
        return ImportSecretModes.ENCRYPTED;
    }

    if (vaultState === VaultStates.LOCKED) {
        return ImportSecretModes.LOCKED;
    }

    if (isVaultRequired) {
        return ImportSecretModes.REQUIRED;
    }

    return ImportSecretModes.PLAIN;
};

const isTypedSecret = (variable: EnvVariable): boolean => variable.secret && variable.value !== '';

export const countTypedSecrets = (environment: NotRequired<Environment>): number =>
    environment?.variables.filter(isTypedSecret).length ?? 0;

/** Secrets the file leaves without a value, which the user fills in before sending */
export const getEmptySecretNames = (environment: NotRequired<Environment>): string[] =>
    (environment?.variables ?? [])
        .filter(variable => variable.secret && variable.value === '')
        .map(variable => variable.key);

const emptySecret = (variable: EnvVariable): EnvVariable => (variable.secret ? { ...variable, value: '' } : variable);

/** The environment as the background will take it now */
export const applyImportSecretMode = (environment: Environment, mode: ImportSecretMode): Environment => {
    if (KEPT_SECRET_MODES.includes(mode)) {
        return environment;
    }

    return {
        ...environment,
        variables: environment.variables.map(emptySecret),
    };
};
