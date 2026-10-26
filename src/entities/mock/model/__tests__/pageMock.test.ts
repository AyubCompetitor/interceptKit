import { describe, expect, it } from '@rstest/core';

import { validate } from '#shared/lib';

import { mapMockToPageMock, mockListMessage } from '../pageMock.ts';

import { makeCheckedMock, makePageMock, makeResponse } from './mocks.ts';

const ENABLED_HEADER = { key: 'X-Mocked', value: 'yes', enabled: true };

const DISABLED_HEADER = { key: 'X-Draft', value: 'no', enabled: false };

describe('mockListMessage', () => {
    it('accepts a list of page mocks', () => {
        expect(validate(mockListMessage, { xr: 1, mocks: [makePageMock()] }).ok).toBe(true);
    });

    it.each([
        { name: 'a message without our marker', message: { mocks: [] } },
        { name: 'a message with another marker', message: { xr: 2, mocks: [] } },
        { name: 'a mock list that is not a list', message: { xr: 1, mocks: {} } },
        {
            name: 'a mock with a status Response refuses',
            message: { xr: 1, mocks: [{ ...makePageMock(), response: makeResponse({ status: 600 }) }] },
        },
        { name: 'a string the page posts', message: 'hello' },
    ])('rejects $name', ({ message }) => {
        expect(validate(mockListMessage, message).ok).toBe(false);
    });
});

describe('mapMockToPageMock', () => {
    it('leaves out the name, the owner and disabled headers', () => {
        const mock = makeCheckedMock({ response: makeResponse({ headers: [ENABLED_HEADER, DISABLED_HEADER] }) });

        expect(mapMockToPageMock(mock)).toEqual({
            match: mock.match,
            response: makeResponse({ headers: [ENABLED_HEADER] }),
        });
    });
});
