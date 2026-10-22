import { describe, expect, it } from '@rstest/core';

import { validate } from '#shared/lib';

import { OPEN_REQUESTS_KEY, openRequestsValidator } from '../openRequests.ts';

import { makeRequest } from './mocks.ts';

const makeOpenRequests = (overrides: Record<string, unknown> = {}) => ({
    id: OPEN_REQUESTS_KEY,
    requests: [makeRequest(), makeRequest({ id: 'q2' })],
    activeId: 'q2',
    ...overrides,
});

describe('openRequestsValidator', () => {
    it('accepts the requests of the tabs with the active one among them', () => {
        expect(validate(openRequestsValidator, makeOpenRequests()).ok).toBe(true);
    });

    it.each([
        { name: 'an active request that is not open', openRequests: makeOpenRequests({ activeId: 'gone' }) },
        { name: 'no requests at all', openRequests: makeOpenRequests({ requests: [] }) },
        { name: 'another record key', openRequests: makeOpenRequests({ id: 'tabs' }) },
    ])('rejects $name', ({ openRequests }) => {
        expect(validate(openRequestsValidator, openRequests).ok).toBe(false);
    });
});
