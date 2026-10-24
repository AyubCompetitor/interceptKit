import { describe, expect, it } from '@rstest/core';

import type { Environment } from '../environment.ts';
import {
    createVaultKey,
    decryptEnvironment,
    dropEncryptedValues,
    getEncryptedNames,
    getVaultState,
    isEnvironmentSealed,
    openVaultKey,
    resealEnvironment,
    revealSecrets,
    sealEnvironment,
    vaultValidator,
    VaultStates,
} from '../vault.ts';

import { encryptText, validate } from '#shared/lib';

/** Below the stored minimum, so only the model is tested here and not the validator */
const TEST_ITERATIONS = 1000;

const PASSWORD = 'correct horse';

const { keyParams, keyBytes } = await createVaultKey(PASSWORD, TEST_ITERATIONS);

const OTHER_VAULT = await createVaultKey('other horse', TEST_ITERATIONS);

const ENCRYPTED_TOKEN = await encryptText(keyBytes, 'abc');

const PLAIN_ENVIRONMENT: Environment = {
    id: 'staging',
    name: 'Staging',
    variables: [
        { key: 'baseUrl', value: 'https://staging.example.com', enabled: true, secret: false },
        { key: 'token', value: 'abc', enabled: true, secret: true },
    ],
};

const SEALED_ENVIRONMENT: Environment = {
    ...PLAIN_ENVIRONMENT,
    variables: [
        { key: 'baseUrl', value: 'https://staging.example.com', enabled: true, secret: false },
        { key: 'token', value: ENCRYPTED_TOKEN, enabled: true, secret: true },
        { key: 'old', value: ENCRYPTED_TOKEN, enabled: false, secret: true },
    ],
};

describe('getVaultState', () => {
    it.each([
        { name: 'off without key parameters', vault: {}, status: {}, state: VaultStates.OFF },
        { name: 'locked without an unlock', vault: { keyParams }, status: {}, state: VaultStates.LOCKED },
        {
            name: 'unlocked until the auto-lock',
            vault: { keyParams },
            status: { unlockedUntil: 1 },
            state: VaultStates.UNLOCKED,
        },
    ])('is $name', ({ vault, status, state }) => {
        expect(getVaultState(vault, status)).toBe(state);
    });
});

describe('openVaultKey', () => {
    it('opens the key with the right password', async () => {
        expect(await openVaultKey(PASSWORD, keyParams)).toBe(keyBytes);
    });

    it('gives nothing for a wrong password', async () => {
        expect(await openVaultKey('wrong horse', keyParams)).toBeUndefined();
    });
});

describe('vaultValidator', () => {
    it('takes the parameters of a vault with enough rounds', () => {
        const strongParams = { ...keyParams, iterations: 600_000 };

        expect(validate(vaultValidator, { keyParams: strongParams }).ok).toBe(true);
    });

    it('rejects too few rounds', () => {
        expect(validate(vaultValidator, { keyParams }).ok).toBe(false);
    });
});

describe('sealEnvironment', () => {
    it('encrypts typed secrets and leaves other values as typed', async () => {
        const sealed = await sealEnvironment(PLAIN_ENVIRONMENT, keyBytes);
        const [baseUrl, token] = sealed.variables;

        expect(baseUrl).toEqual(PLAIN_ENVIRONMENT.variables[0]);

        expect(isEnvironmentSealed(sealed)).toBe(true);

        expect(await revealSecrets(sealed, keyBytes)).toEqual([{ key: 'token', value: 'abc' }]);

        expect(token?.value).not.toBe('abc');
    });

    it('opens the value of a variable that is no longer secret', async () => {
        const unmarked: Environment = {
            ...PLAIN_ENVIRONMENT,
            variables: [{ key: 'token', value: ENCRYPTED_TOKEN, enabled: true, secret: false }],
        };

        const sealed = await sealEnvironment(unmarked, keyBytes);

        expect(sealed.variables[0]?.value).toBe('abc');
    });

    it('keeps an environment that is sealed already', async () => {
        expect(await sealEnvironment(SEALED_ENVIRONMENT, keyBytes)).toEqual(SEALED_ENVIRONMENT);
    });
});

describe('isEnvironmentSealed', () => {
    it.each([
        { name: 'a typed secret', environment: PLAIN_ENVIRONMENT, isSealed: false },
        { name: 'encrypted secrets only', environment: SEALED_ENVIRONMENT, isSealed: true },
        {
            name: 'an empty secret, which has nothing to hide',
            environment: {
                ...PLAIN_ENVIRONMENT,
                variables: [{ key: 'token', value: '', enabled: true, secret: true }],
            },
            isSealed: true,
        },
    ])('is $isSealed with $name', ({ environment, isSealed }) => {
        expect(isEnvironmentSealed(environment)).toBe(isSealed);
    });
});

describe('decryptEnvironment', () => {
    it('gives every value as typed', async () => {
        const decrypted = await decryptEnvironment(SEALED_ENVIRONMENT, keyBytes);
        const values = decrypted.variables.map(variable => variable.value);

        expect(values).toEqual(['https://staging.example.com', 'abc', 'abc']);
    });
});

describe('resealEnvironment', () => {
    it('moves the secrets from the old key to the new one', async () => {
        const resealed = await resealEnvironment(SEALED_ENVIRONMENT, keyBytes, OTHER_VAULT.keyBytes);

        expect(await revealSecrets(resealed, OTHER_VAULT.keyBytes)).toEqual([{ key: 'token', value: 'abc' }]);

        expect(await revealSecrets(resealed, keyBytes)).toEqual([]);
    });
});

describe('dropEncryptedValues', () => {
    it('empties the encrypted values and keeps their variables', () => {
        const dropped = dropEncryptedValues(SEALED_ENVIRONMENT);
        const values = dropped.variables.map(variable => variable.value);

        expect(values).toEqual(['https://staging.example.com', '', '']);

        expect(dropped.variables.map(variable => variable.key)).toEqual(['baseUrl', 'token', 'old']);
    });
});

describe('getEncryptedNames', () => {
    it('names the switched-on encrypted variables', () => {
        expect(getEncryptedNames(SEALED_ENVIRONMENT)).toEqual(['token']);
    });

    it('names none without an environment', () => {
        expect(getEncryptedNames(undefined)).toEqual([]);
    });
});

describe('revealSecrets', () => {
    it('opens the switched-on secrets only', async () => {
        expect(await revealSecrets(SEALED_ENVIRONMENT, keyBytes)).toEqual([{ key: 'token', value: 'abc' }]);
    });

    it('leaves out values that do not open with the key', async () => {
        expect(await revealSecrets(SEALED_ENVIRONMENT, OTHER_VAULT.keyBytes)).toEqual([]);
    });
});
