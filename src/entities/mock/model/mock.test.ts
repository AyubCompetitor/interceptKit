import { describe, expect, it } from '@rstest/core';

import { validate } from '#shared/lib';

import { mockValidator, mocksValidator } from './mock.ts';

const RESPONSE = { status: 200, headers: [], bodyType: 'json', body: '{"ok":true}', delayMs: 0 };

const MOCK = {
    id: 'm1',
    name: 'Users',
    enabled: true,
    source: 'user',
    match: { url: { kind: 'filter', value: '||api.example.com/users' }, methods: ['GET'] },
    response: RESPONSE,
};

describe('mock', () => {
    it('accepts a valid mock', () => {
        expect(validate(mockValidator, MOCK).ok).toBe(true);
    });

    it('keeps status within what Response accepts', () => {
        expect(validate(mockValidator, { ...MOCK, response: { ...RESPONSE, status: 101 } }).ok).toBe(false);

        expect(validate(mockValidator, { ...MOCK, response: { ...RESPONSE, status: 600 } }).ok).toBe(false);
    });

    it('forbids bodies for null-body statuses', () => {
        const noContent = { ...RESPONSE, status: 204 };

        expect(validate(mockValidator, { ...MOCK, response: noContent }).ok).toBe(false);

        expect(validate(mockValidator, { ...MOCK, response: { ...noContent, body: '' } }).ok).toBe(true);
    });

    it('requires JSON bodies to parse', () => {
        const text = { ...RESPONSE, bodyType: 'text', body: '{' };

        expect(validate(mockValidator, { ...MOCK, response: { ...RESPONSE, body: '{' } }).ok).toBe(false);

        expect(validate(mockValidator, { ...MOCK, response: text }).ok).toBe(true);
    });

    it('limits the delay and validates response headers', () => {
        const slow = { ...RESPONSE, delayMs: 120_000 };
        const badHeader = { ...RESPONSE, headers: [{ key: 'Bad Name', value: 'x', enabled: true }] };

        expect(validate(mockValidator, { ...MOCK, response: slow }).ok).toBe(false);

        expect(validate(mockValidator, { ...MOCK, response: badHeader }).ok).toBe(false);
    });

    it('requires unique ids in a mock list', () => {
        expect(validate(mocksValidator, [MOCK, MOCK]).ok).toBe(false);
    });
});
