import { describe, expect, it } from '@rstest/core';

import type { Environment } from '../environment.ts';
import { fillVariables, getMissingVariables, getVariableValues } from '../variables.ts';

const ENCRYPTED_VALUE = { v: 1, iv: 'AAAAAAAAAAAAAAAA', ct: 'c2VjcmV0' } as const;

const STAGING: Environment = {
    id: 'staging',
    name: 'Staging',
    variables: [
        { key: 'baseUrl', value: 'https://staging.example.com', enabled: true, secret: false },
        { key: 'token', value: 'abc', enabled: true, secret: true },
        { key: 'old', value: 'gone', enabled: false, secret: false },
        { key: 'locked', value: ENCRYPTED_VALUE, enabled: true, secret: true },
    ],
};

const VALUES = getVariableValues(STAGING);

describe('getVariableValues', () => {
    it('gives the enabled plain values, secret or not', () => {
        expect(Object.fromEntries(VALUES)).toEqual({ baseUrl: 'https://staging.example.com', token: 'abc' });
    });

    it('gives nothing without an environment', () => {
        expect(getVariableValues(undefined).size).toBe(0);
    });
});

describe('fillVariables', () => {
    it.each([
        { text: '{{baseUrl}}/users', filled: 'https://staging.example.com/users' },
        { text: 'Bearer {{token}}', filled: 'Bearer abc' },
        { text: '{{unknown}} and {{old}}', filled: '{{unknown}} and {{old}}' },
        { text: '{{ token }} {token}', filled: '{{ token }} {token}' },
    ])('fills "$text"', ({ text, filled }) => {
        expect(fillVariables(text, VALUES)).toBe(filled);
    });
});

describe('getMissingVariables', () => {
    it('names each variable without a value once, in order', () => {
        const texts = ['{{baseUrl}}/{{id}}', '{{locked}}', '{{id}}', 'no templates'];

        expect(getMissingVariables(texts, VALUES)).toEqual(['id', 'locked']);
    });
});
