import { array, literal, object, type Validator } from '#shared/lib';

import { MAX_MOCKS, mockMatch, mockResponse, type Mock, type MockMatch, type MockResponse } from './mock.ts';

/** What a page gets of a mock: only what its interceptor needs to answer, since page scripts can read it */
export interface PageMock {
    /** Which requests the mock answers */
    readonly match: MockMatch;
    /** What the page receives instead of the real response */
    readonly response: MockResponse;
}

/** What the bridge posts to the page; page scripts can post the same, so it is checked like any input */
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

/** Leaves out the name, the owner and disabled headers: the page has no use for them */
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
