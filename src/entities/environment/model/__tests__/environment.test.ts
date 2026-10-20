import { describe, expect, it } from '@rstest/core';

import { validate } from '#shared/lib';

import { environmentValidator } from '../environment.ts';

import { ENCRYPTED_VALUE, makeEnvironment, makeVariable, SECRET_VARIABLE } from './mocks.ts';

describe('environmentValidator', () => {
    it('accepts plain and encrypted variables', () => {
        expect(validate(environmentValidator, makeEnvironment()).ok).toBe(true);
    });

    it.each([
        {
            name: 'an encrypted value on a variable that is not secret',
            variables: [makeVariable({ value: ENCRYPTED_VALUE })],
        },
        {
            name: 'a malformed ciphertext envelope',
            variables: [{ ...SECRET_VARIABLE, value: { ...ENCRYPTED_VALUE, iv: 'short' } }],
        },
        {
            name: 'duplicate variable names',
            variables: [makeVariable(), makeVariable()],
        },
        {
            name: 'a variable name that starts with a digit',
            variables: [makeVariable({ key: '1bad' })],
        },
    ])('rejects $name', ({ variables }) => {
        expect(validate(environmentValidator, makeEnvironment(variables)).ok).toBe(false);
    });
});
