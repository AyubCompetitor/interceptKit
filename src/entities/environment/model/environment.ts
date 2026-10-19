import { array, boolean, fail, identifier, literal, object, refine, string, type Validator } from '#shared/lib';

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

const ENV_PATTERNS = {
    BASE64: /^[A-Za-z0-9+/]*={0,2}$/,
    VARIABLE_KEY: /^[A-Za-z_][A-Za-z0-9_.-]*$/,
} as const;

const encryptedValue: Validator<EncryptedValue> = object({
    v: literal(1),
    iv: string({ minLength: 16, maxLength: 16, pattern: ENV_PATTERNS.BASE64 }),
    ct: string({ minLength: 1, maxLength: 1_000_000, pattern: ENV_PATTERNS.BASE64 }),
});

const plainValue = string({ maxLength: 100_000 });

const variableValue: Validator<string | EncryptedValue> = (input, path) => {
    if (typeof input === 'string') {
        return plainValue(input, path);
    }

    if (typeof input === 'object' && input !== null) {
        return encryptedValue(input, path);
    }

    return fail(path, 'expected a string or an encrypted value');
};

const variable: Validator<EnvVariable> = refine(
    object({
        key: string({ minLength: 1, maxLength: 100, pattern: ENV_PATTERNS.VARIABLE_KEY }),
        enabled: boolean(),
        secret: boolean(),
        value: variableValue,
    }),
    entry => (!entry.secret && typeof entry.value !== 'string' ? 'only secret variables can be encrypted' : undefined),
);

export const environmentValidator: Validator<Environment> = refine(
    object({
        id: identifier,
        name: string({ minLength: 1, maxLength: 200 }),
        variables: array(variable, { maxLength: 1000 }),
    }),
    environment =>
        new Set(environment.variables.map(entry => entry.key)).size === environment.variables.length
            ? undefined
            : 'duplicate variable name',
);
