import {
    array,
    boolean,
    headerName,
    headerValue,
    HTTP_METHODS,
    httpMethod,
    identifier,
    number,
    object,
    oneOf,
    optional,
    refine,
    string,
    urlPattern,
    type HttpMethod,
    type KeyValue,
    type UrlPattern,
    type Validator,
} from '#shared/lib';

export interface MockResponse {
    /** 200–599 the range new Response() accepts. */
    readonly status: number;
    /** Response headers */
    readonly headers: readonly KeyValue[];
    /** json bodies must parse */
    readonly bodyType: 'json' | 'text';
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
    /** `policy` mocks come from the administrator and are read-only in the UI */
    readonly source: 'user' | 'policy';
    /** Which requests the mock answers */
    readonly match: MockMatch;
    /** What the page receives instead of the real response */
    readonly response: MockResponse;
}

export const MAX_MOCKS = 1000;

/** Mock bodies live in chromestoragelocal (10 MB in total) and are visible to the page */
export const MAX_MOCK_BODY_LENGTH = 1_048_576;

/** Statuses whose responses must not have a body (fetch throws otherwise) */
const NULL_BODY_STATUSES = new Set([204, 205, 304]);

const isJson = (text: string): boolean => {
    try {
        JSON.parse(text);

        return true;
    } catch {
        return false;
    }
};

const mockResponse: Validator<MockResponse> = refine(
    object({
        status: number({ integer: true, min: 200, max: 599 }),
        headers: array(object({ key: headerName, value: headerValue, enabled: boolean() }), { maxLength: 100 }),
        bodyType: oneOf(['json', 'text']),
        body: string({ maxLength: MAX_MOCK_BODY_LENGTH }),
        delayMs: number({ integer: true, min: 0, max: 60_000 }),
    }),
    response => {
        if (NULL_BODY_STATUSES.has(response.status) && response.body !== '') {
            return `status ${response.status} cannot have a body`;
        }

        if (response.bodyType === 'json' && response.body !== '' && !isJson(response.body)) {
            return 'body is not valid JSON';
        }

        return;
    },
);

export const mockValidator: Validator<Mock> = object({
    id: identifier,
    name: string({ minLength: 1, maxLength: 200 }),
    enabled: boolean(),
    source: oneOf(['user', 'policy']),
    match: object({
        url: urlPattern,
        methods: optional(array(httpMethod, { minLength: 1, maxLength: HTTP_METHODS.length })),
    }),
    response: mockResponse,
});

export const mocksValidator: Validator<Mock[]> = refine(array(mockValidator, { maxLength: MAX_MOCKS }), mocks =>
    new Set(mocks.map(mock => mock.id)).size === mocks.length ? undefined : 'duplicate mock id',
);
