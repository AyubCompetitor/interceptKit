import { describe, expect, it } from '@rstest/core';

import { Sources, validate } from '#shared/lib';

import { MockBodyTypes, mocksValidator, mockValidator } from '../mock.ts';

import { makeMock } from './mocks.ts';

describe('mockValidator', () => {
    it('accepts a valid mock', () => {
        expect(validate(mockValidator, makeMock()).ok).toBe(true);
    });

    it.each([
        { name: 'status 204 with an empty body', response: { status: 204, body: '' } },
        { name: 'a text body that is not JSON', response: { bodyType: MockBodyTypes.TEXT, body: '{' } },
    ])('accepts $name', ({ response }) => {
        expect(validate(mockValidator, makeMock(response)).ok).toBe(true);
    });

    it.each([
        { name: 'status 101, below what Response accepts', response: { status: 101 } },
        { name: 'status 600, above what Response accepts', response: { status: 600 } },
        { name: 'a body on status 204', response: { status: 204 } },
        { name: 'a JSON body that does not parse', response: { body: '{' } },
        { name: 'a delay over a minute', response: { delayMs: 120_000 } },
        { name: 'an invalid header name', response: { headers: [{ key: 'Bad Name', value: 'x', enabled: true }] } },
    ])('rejects $name', ({ response }) => {
        expect(validate(mockValidator, makeMock(response)).ok).toBe(false);
    });
});

describe('mocksValidator', () => {
    it('rejects duplicate ids', () => {
        expect(validate(mocksValidator, [makeMock(), makeMock()]).ok).toBe(false);
    });
});

describe('ids of the policy', () => {
    it('belong only to records of the policy', () => {
        const userMock = { ...makeMock(), id: 'policy:m1' };

        expect(validate(mockValidator, { ...userMock, source: Sources.POLICY }).ok).toBe(true);

        expect(validate(mockValidator, userMock).ok).toBe(false);
    });
});
