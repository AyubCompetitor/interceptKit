import { buildMockHeaders, resolveRequestUrl, type MockRequest, type PageMock } from '#entities/mock';

import { waitForMockDelay } from './mockDelay.ts';
import { findMock, waitForMockList } from './mockList.ts';

const DEFAULT_METHOD = 'GET';

/** Taken before page scripts run, so requests without a mock go to the browser's own fetch */
const nativeFetch = window.fetch;

const getRawUrl = (input: RequestInfo | URL): string => {
    if (input instanceof Request) {
        return input.url;
    }

    return String(input);
};

const getMethod = (input: RequestInfo | URL, init: NotRequired<RequestInit>): string => {
    if (init?.method !== undefined) {
        return init.method;
    }

    if (input instanceof Request) {
        return input.method;
    }

    return DEFAULT_METHOD;
};

const getSignal = (input: RequestInfo | URL, init: NotRequired<RequestInit>): NotRequired<AbortSignal> => {
    if (init?.signal) {
        return init.signal;
    }

    if (input instanceof Request) {
        return input.signal;
    }

    return;
};

const getMockRequest = (input: RequestInfo | URL, init: NotRequired<RequestInit>): NotRequired<MockRequest> => {
    const url = resolveRequestUrl(getRawUrl(input), document.baseURI);

    if (url === undefined) {
        return;
    }

    return {
        url,
        method: getMethod(input, init),
    };
};

/** Statuses such as 204 refuse even an empty body, so no text means no body at all */
const getMockBody = (mock: PageMock): Nullable<string> => {
    const hasBody = mock.response.body !== '';

    if (!hasBody) {
        return null;
    }

    return mock.response.body;
};

const buildMockResponse = (mock: PageMock, url: string): Response => {
    const response = new Response(getMockBody(mock), {
        status: mock.response.status,
        headers: buildMockHeaders(mock.response),
    });

    /** A built response has an empty URL, while pages may read it */
    Object.defineProperty(response, 'url', { value: url });

    return response;
};

const interceptedFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    await waitForMockList();

    const request = getMockRequest(input, init);

    if (!request) {
        return nativeFetch(input, init);
    }

    const mock = findMock(request);

    if (!mock) {
        return nativeFetch(input, init);
    }

    await waitForMockDelay(mock.response.delayMs, getSignal(input, init));

    return buildMockResponse(mock, request.url);
};

export const interceptFetch: VoidFunction = () => {
    window.fetch = interceptedFetch;
};
