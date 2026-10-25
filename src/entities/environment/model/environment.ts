import {
    array,
    boolean,
    displayName,
    encryptedValue,
    fail,
    isDuplicateValues,
    identifier,
    object,
    refine,
    string,
    type EncryptedValue,
    type Validator,
} from '#shared/lib';

export interface EnvVariable {
    /** Name used in {{key}} templates */
    readonly key: string;
    /** Disabled variables are kept but not substituted */
    readonly enabled: boolean;
    /** Secrets are masked in the UI, excluded from exports and encrypted when the vault is on */
    readonly secret: boolean;
    /** Plain text, or an encrypted envelope for a secret */
    readonly value: string | EncryptedValue;
}

export interface Environment {
    /** Unique among environments */
    readonly id: string;
    /** Name shown in the UI */
    readonly name: string;
    /** Variables with unique keys */
    readonly variables: readonly EnvVariable[];
}

export const MAX_ENVIRONMENTS = 100;

const VARIABLE_KEY_RGX = /^[A-Za-z_][A-Za-z0-9_.-]*$/;

const MAX_VARIABLE_KEY_LENGTH = 100;

const ENV_ERRORS = {
    INVALID_VALUE: 'expected a string or an encrypted value',
    PLAIN_ENCRYPTED: 'only secret variables can be encrypted',
    DUPLICATE_KEY: 'duplicate variable name',
    DUPLICATE_ID: 'duplicate environment id',
} as const;

/** A name that {{name}} templates can use */
export const isVariableKey = (key: string): boolean =>
    key.length <= MAX_VARIABLE_KEY_LENGTH && VARIABLE_KEY_RGX.test(key);

export const isEncryptedValue = (value: string | EncryptedValue): value is EncryptedValue => typeof value !== 'string';

const plainValue = string({ maxLength: 100_000 });

const variableValue: Validator<string | EncryptedValue> = (input, path) => {
    if (typeof input === 'string') {
        return plainValue(input, path);
    }

    const isObject = typeof input === 'object' && input !== null;

    if (isObject) {
        return encryptedValue(input, path);
    }

    return fail(path, ENV_ERRORS.INVALID_VALUE);
};

const getEncryptionError = (variable: EnvVariable): NotRequired<string> => {
    if (!isEncryptedValue(variable.value) || variable.secret) {
        return;
    }

    return ENV_ERRORS.PLAIN_ENCRYPTED;
};

const getDuplicateKeyError = (environment: Environment): NotRequired<string> => {
    const keys = environment.variables.map(variable => variable.key);

    if (!isDuplicateValues(keys)) {
        return;
    }

    return ENV_ERRORS.DUPLICATE_KEY;
};

const variable: Validator<EnvVariable> = refine(
    object({
        key: string({
            minLength: 1,
            maxLength: MAX_VARIABLE_KEY_LENGTH,
            pattern: VARIABLE_KEY_RGX,
        }),
        enabled: boolean(),
        secret: boolean(),
        value: variableValue,
    }),
    getEncryptionError,
);

export const environmentValidator: Validator<Environment> = refine(
    object({
        id: identifier,
        name: displayName,
        variables: array(variable, { maxLength: 1000 }),
    }),
    getDuplicateKeyError,
);

const getDuplicateIdError = (environments: readonly Environment[]): NotRequired<string> => {
    const ids = environments.map(environment => environment.id);

    if (!isDuplicateValues(ids)) {
        return;
    }

    return ENV_ERRORS.DUPLICATE_ID;
};

export const environmentsValidator: Validator<Environment[]> = refine(
    array(environmentValidator, { maxLength: MAX_ENVIRONMENTS }),
    getDuplicateIdError,
);
