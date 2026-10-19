import { describe, expect, it } from '@rstest/core';

import { validate } from '#shared/lib';

import { environmentValidator } from './environment.ts';

const ENCRYPTED = { v: 1, iv: 'AAAAAAAAAAAAAAAA', ct: 'c2VjcmV0' };

const ENVIRONMENT = {
    id: 'e1',
    name: 'Staging',
    variables: [
        { key: 'baseUrl', enabled: true, secret: false, value: 'https://staging.example.com' },
        { key: 'token', enabled: true, secret: true, value: ENCRYPTED },
    ],
};

describe('environment', () => {
    it('accepts plain and encrypted variables', () => {
        expect(validate(environmentValidator, ENVIRONMENT).ok).toBe(true);
    });

    it('only encrypts secrets', () => {
        const variables = [{ key: 'baseUrl', enabled: true, secret: false, value: ENCRYPTED }];

        expect(validate(environmentValidator, { ...ENVIRONMENT, variables }).ok).toBe(false);
    });

    it('rejects malformed ciphertext envelopes', () => {
        const variables = [{ key: 'token', enabled: true, secret: true, value: { ...ENCRYPTED, iv: 'short' } }];

        expect(validate(environmentValidator, { ...ENVIRONMENT, variables }).ok).toBe(false);
    });

    it('requires unique, well-formed variable names', () => {
        const first = ENVIRONMENT.variables[0];
        const badKey = { ...first, key: '1bad' };

        expect(validate(environmentValidator, { ...ENVIRONMENT, variables: [first, first] }).ok).toBe(false);

        expect(validate(environmentValidator, { ...ENVIRONMENT, variables: [badKey] }).ok).toBe(false);
    });
});
