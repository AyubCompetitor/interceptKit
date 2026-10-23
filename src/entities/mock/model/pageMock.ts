import { array, literal, object, type Validator } from '#shared/lib';

import { MAX_MOCKS, mockMatch, mockResponse, type Mock, type MockMatch, type MockResponse } from './mock.ts';

export interface PageMock {
    /** Which requests the mock answers */
    readonly match: MockMatch;
    /** What the page receives instead of the real response */
    readonly response: MockResponse;
}

export interface MockListMessage {
    /** Marks our messages among the page's own */
    readonly ik: 1;
    /** Mocks of the site, in priority order */
    readonly mocks: readonly PageMock[];
}

const pageMock: Validator<PageMock> = object({
    match: mockMatch,
    response: mockResponse,
});

export const mockListMessage: Validator<MockListMessage> = object({
    ik: literal(1),
    mocks: array(pageMock, { maxLength: MAX_MOCKS }),
});

export const mapMockToPageMock = (mock: Mock): PageMock => {
    const headers = mock.response.headers.filter(header => header.enabled);

    return {
        match: mock.match,
        response: {
            ...mock.response,
            headers,
        },
    };
};
