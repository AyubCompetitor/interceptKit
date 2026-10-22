import {
    array,
    boolean,
    displayName,
    fail,
    isDuplicateValues,
    identifier,
    literal,
    object,
    refine,
    string,
    type Validator,
} from '#shared/lib';

/** A secret encrypted with AES-GCM under a key derived from the master password */
export interface EncryptedValue {
    /** Envelope format version */
    readonly v: 1;
    /** Base64 of a 12-byte nonce */
    readonly iv: string;
    /** Base64 ciphertext with the authentication tag */
    readonly ct: string;
}

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

const ENV_RGXS = {
    BASE64: /^[A-Za-z0-9+/]*={0,2}$/,
    /** The same name rule as the {{name}} templates in requests */
    VARIABLE_KEY: /^[A-Za-z_][A-Za-z0-9_.-]*$/,
} as const;

const ENV_ERRORS = {
    INVALID_VALUE: 'expected a string or an encrypted value',
    PLAIN_ENCRYPTED: 'only secret variables can be encrypted',
    DUPLICATE_KEY: 'duplicate variable name',
    DUPLICATE_ID: 'duplicate environment id',
} as const;

export const isEncryptedValue = (value: string | EncryptedValue): value is EncryptedValue => typeof value !== 'string';

const encryptedValue: Validator<EncryptedValue> = object({
    v: literal(1),
    iv: string({ minLength: 16, maxLength: 16, pattern: ENV_RGXS.BASE64 }),
    ct: string({ minLength: 1, maxLength: 1_000_000, pattern: ENV_RGXS.BASE64 }),
});

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
    if (isEncryptedValue(variable.value) && !variable.secret) {
        return ENV_ERRORS.PLAIN_ENCRYPTED;
    }

    return;
};

const getDuplicateKeyError = (environment: Environment): NotRequired<string> => {
    const keys = environment.variables.map(variable => variable.key);

    if (isDuplicateValues(keys)) {
        return ENV_ERRORS.DUPLICATE_KEY;
    }

    return;
};

const variable: Validator<EnvVariable> = refine(
    object({
        key: string({ minLength: 1, maxLength: 100, pattern: ENV_RGXS.VARIABLE_KEY }),
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

    if (isDuplicateValues(ids)) {
        return ENV_ERRORS.DUPLICATE_ID;
    }

    return;
};

export const environmentsValidator: Validator<Environment[]> = refine(
    array(environmentValidator, { maxLength: MAX_ENVIRONMENTS }),
    getDuplicateIdError,
);
