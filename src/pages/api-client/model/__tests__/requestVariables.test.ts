import { describe, expect, it } from '@rstest/core';

import { buildApiRequest } from '../requestDraft.ts';
import { getBlockedSecretNames, resolveRequestVariables } from '../requestVariables.ts';
import { NO_SECRETS } from '../vaultSecrets.ts';

import type { Environment } from '#entities/environment';

import { makeDraft, makeRow } from './mocks.ts';

const STAGING: Environment = {
    id: 'staging',
    name: 'Staging',
    variables: [
        { key: 'baseUrl', value: 'https://staging.example.com', enabled: true, secret: false },
        { key: 'token', value: 'abc', enabled: true, secret: true },
    ],
};

const ENCRYPTED_STAGING: Environment = {
    ...STAGING,
    variables: [
        { key: 'baseUrl', value: 'https://staging.example.com', enabled: true, secret: false },
        { key: 'token', value: { v: 1, iv: 'AAAAAAAAAAAAAAAA', ct: 'AAAA' }, enabled: true, secret: true },
    ],
};

const SECRETS = new Map([['token', 'opened']]);

const REQUEST = buildApiRequest(
    makeDraft({
        url: '{{baseUrl}}/users/{{id}}',
        headers: [makeRow('Authorization', 'Bearer {{token}}')],
    }),
);

describe('resolveRequestVariables', () => {
    it('fills the variables of the environment and names the missing ones', () => {
        const { request, missingNames } = resolveRequestVariables(REQUEST, STAGING, NO_SECRETS);

        expect(request.url).toBe('https://staging.example.com/users/{{id}}');

        expect(request.headers[0]?.value).toBe('Bearer abc');

        expect(missingNames).toEqual(['id']);
    });

    it('names every variable without an environment', () => {
        const { missingNames } = resolveRequestVariables(REQUEST, undefined, NO_SECRETS);

        expect(missingNames).toEqual(['baseUrl', 'id', 'token']);
    });

    it('leaves the request as typed', () => {
        resolveRequestVariables(REQUEST, STAGING, NO_SECRETS);

        expect(REQUEST.url).toBe('{{baseUrl}}/users/{{id}}');
    });

    describe('with encrypted variables', () => {
        it('takes their values from the opened secrets', () => {
            const { request, missingNames, secretNames } = resolveRequestVariables(REQUEST, ENCRYPTED_STAGING, SECRETS);

            expect(request.headers[0]?.value).toBe('Bearer opened');

            expect(missingNames).toEqual(['id']);

            expect(secretNames).toEqual(['token']);
        });

        it('leaves them missing while the vault is locked', () => {
            const { missingNames, secretNames } = resolveRequestVariables(REQUEST, ENCRYPTED_STAGING, NO_SECRETS);

            expect(missingNames).toEqual(['id', 'token']);

            expect(secretNames).toEqual(['token']);
        });

        it('names no secret for a request that uses none', () => {
            const plainRequest = buildApiRequest(makeDraft({ url: '{{baseUrl}}/health' }));

            expect(resolveRequestVariables(plainRequest, ENCRYPTED_STAGING, SECRETS).secretNames).toEqual([]);
        });
    });
});

describe('getBlockedSecretNames', () => {
    it('names the typed secrets the request uses when the policy requires the vault', () => {
        expect(getBlockedSecretNames(REQUEST, STAGING, true)).toEqual(['token']);
    });

    it.each([
        { name: 'the policy does not require the vault', environment: STAGING, isVaultRequired: false },
        { name: 'the secrets are encrypted', environment: ENCRYPTED_STAGING, isVaultRequired: true },
    ])('names none when $name', ({ environment, isVaultRequired }) => {
        expect(getBlockedSecretNames(REQUEST, environment, isVaultRequired)).toEqual([]);
    });
});
