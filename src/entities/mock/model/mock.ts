import {
    array,
    boolean,
    displayName,
    isDuplicateValues,
    headerName,
    headerValue,
    httpMethods,
    identifier,
    number,
    object,
    oneOf,
    optional,
    refine,
    source,
    string,
    urlPattern,
    type HttpMethod,
    type KeyValue,
    type Source,
    type UrlPattern,
    type Validator,
} from '#shared/lib';

export enum MockBodyTypes {
    JSON = 'json',
    TEXT = 'text',
}

export type MockBodyType = `${MockBodyTypes}`;

export const MOCK_BODY_TYPES = Object.values(MockBodyTypes);

export interface MockResponse {
    /** 200–599, the range new Response() accepts */
    readonly status: number;
    /** Response headers */
    readonly headers: readonly KeyValue[];
    /** json bodies must parse */
    readonly bodyType: MockBodyType;
    /** Response body as text */
    readonly body: string;
    /** Delay before the response, in milliseconds */
    readonly delayMs: number;
}

/** Which requests a mock answers */
export interface MockMatch {
    /** Condition on the request URL */
    readonly url: UrlPattern;
    /** Only requests with these methods */
    readonly methods?: readonly HttpMethod[];
}

/** A canned response returned to fetch/XHR on sites where mocks are enabled */
export interface Mock {
    /** Unique within the mock list */
    readonly id: string;
    /** Name shown in the UI */
    readonly name: string;
    /** Disabled mocks are kept but not served */
    readonly enabled: boolean;
    /** Who owns the mock */
    readonly source: Source;
    /** Which requests the mock answers */
    readonly match: MockMatch;
    /** What the page receives instead of the real response */
    readonly response: MockResponse;
}

export const MAX_MOCKS = 1000;

/** Mock bodies live in chrome.storage.local (10 MB in total) and are visible to the page */
export const MAX_MOCK_BODY_LENGTH = 1_048_576;

export const MAX_MOCK_DELAY_MS = 60_000;

/** Statuses whose responses must not have a body (fetch throws otherwise) */
const NULL_BODY_STATUSES = new Set([204, 205, 304]);

const MOCK_ERRORS = {
    BODY_NOT_ALLOWED: 'cannot have a body',
    INVALID_JSON: 'body is not valid JSON',
    DUPLICATE_ID: 'duplicate mock id',
} as const;

const isJson = (text: string): boolean => {
    try {
        JSON.parse(text);

        return true;
    } catch {
        return false;
    }
};

const getMockResponseError = (response: MockResponse): NotRequired<string> => {
    const isResponseBodyEmpty = response.body === '';
    const isNullBodyStatus = NULL_BODY_STATUSES.has(response.status);
    const isJsonBody = response.bodyType === MockBodyTypes.JSON;

    if (isNullBodyStatus && !isResponseBodyEmpty) {
        return `status ${response.status} ${MOCK_ERRORS.BODY_NOT_ALLOWED}`;
    }

    if (!isJsonBody || isResponseBodyEmpty || isJson(response.body)) {
        return;
    }

    return MOCK_ERRORS.INVALID_JSON;
};

const getDuplicateIdError = (mocks: readonly Mock[]): NotRequired<string> => {
    const ids = mocks.map(mock => mock.id);

    if (!isDuplicateValues(ids)) {
        return;
    }

    return MOCK_ERRORS.DUPLICATE_ID;
};

const mockHeader = object({ key: headerName, value: headerValue, enabled: boolean() });

export const mockResponse: Validator<MockResponse> = refine(
    object({
        status: number({ integer: true, min: 200, max: 599 }),
        headers: array(mockHeader, { maxLength: 100 }),
        bodyType: oneOf(MOCK_BODY_TYPES),
        body: string({ maxLength: MAX_MOCK_BODY_LENGTH }),
        delayMs: number({ integer: true, min: 0, max: MAX_MOCK_DELAY_MS }),
    }),
    getMockResponseError,
);

export const mockMatch: Validator<MockMatch> = object({
    url: urlPattern,
    methods: optional(httpMethods),
});

export const mockValidator: Validator<Mock> = object({
    id: identifier,
    name: displayName,
    enabled: boolean(),
    source,
    match: mockMatch,
    response: mockResponse,
});

export const mocksValidator: Validator<Mock[]> = refine(
    array(mockValidator, { maxLength: MAX_MOCKS }),
    getDuplicateIdError,
);
