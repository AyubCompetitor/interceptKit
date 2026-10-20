import { describe, expect, it } from '@rstest/core';

import { validate } from '#shared/lib';

import { apiRequestValidator } from '../request.ts';

import { makeRequest } from './mocks.ts';

describe('apiRequestValidator', () => {
    it('accepts templates with variables', () => {
        expect(validate(apiRequestValidator, makeRequest()).ok).toBe(true);
    });

    it.each(['GET', 'HEAD'])('rejects a body on %s', method => {
        expect(validate(apiRequestValidator, makeRequest({ method })).ok).toBe(false);
    });

    it('accepts GET without a body', () => {
        const request = makeRequest({ method: 'GET', body: { bodyType: 'none' } });

        expect(validate(apiRequestValidator, request).ok).toBe(true);
    });

    it('requires an explicit cookie decision', () => {
        const { sendCookies: _, ...withoutCookies } = makeRequest();

        expect(validate(apiRequestValidator, withoutCookies).ok).toBe(false);
    });
});
