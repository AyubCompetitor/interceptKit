import { describe, expect, it } from '@rstest/core';

import { buildApiRequest } from '../requestDraft.ts';
import { resolveRequestVariables } from '../requestVariables.ts';

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

const REQUEST = buildApiRequest(
    makeDraft({
        url: '{{baseUrl}}/users/{{id}}',
        headers: [makeRow('Authorization', 'Bearer {{token}}')],
    }),
);

describe('resolveRequestVariables', () => {
    it('fills the variables of the environment and names the missing ones', () => {
        const { request, missingNames } = resolveRequestVariables(REQUEST, STAGING);

        expect(request.url).toBe('https://staging.example.com/users/{{id}}');

        expect(request.headers[0]?.value).toBe('Bearer abc');

        expect(missingNames).toEqual(['id']);
    });

    it('names every variable without an environment', () => {
        expect(resolveRequestVariables(REQUEST, undefined).missingNames).toEqual(['baseUrl', 'id', 'token']);
    });

    it('leaves the request as typed', () => {
        resolveRequestVariables(REQUEST, STAGING);

        expect(REQUEST.url).toBe('{{baseUrl}}/users/{{id}}');
    });
});
