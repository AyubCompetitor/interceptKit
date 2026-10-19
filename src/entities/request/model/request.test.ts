import { describe, expect, it } from '@rstest/core';

import { validate } from '#shared/lib';

import { apiRequestValidator } from './request.ts';

const REQUEST = {
    id: 'q1',
    method: 'POST',
    url: '{{baseUrl}}/users',
    query: [],
    headers: [{ key: 'Authorization', value: 'Bearer {{token}}', enabled: true }],
    body: { kind: 'json', text: '{"name":"{{name}}"}' },
    sendCookies: false,
};

describe('api request', () => {
    it('accepts templates with variables', () => {
        expect(validate(apiRequestValidator, REQUEST).ok).toBe(true);
    });

    it('rejects a body on GET and HEAD', () => {
        const get = { ...REQUEST, method: 'GET', body: { kind: 'none' } };

        expect(validate(apiRequestValidator, { ...REQUEST, method: 'GET' }).ok).toBe(false);

        expect(validate(apiRequestValidator, get).ok).toBe(true);
    });

    it('requires an explicit cookie decision', () => {
        const { sendCookies: _, ...withoutCookies } = REQUEST;

        expect(validate(apiRequestValidator, withoutCookies).ok).toBe(false);
    });
});
