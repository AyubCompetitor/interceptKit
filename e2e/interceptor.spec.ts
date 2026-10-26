import type { BrowserContext, Page } from '@playwright/test';
import { join } from 'node:path';

import { MockBodyTypes, type MockListMessage, type PageMock } from '#entities/mock';
import { HttpMethods, SyntaxTypes } from '#shared/lib';

import { EXTENSION_PATH, expect, networkTest } from './fixtures.ts';
import { PAGE_PATH, type TestServerEcho } from './testServer.ts';

/** What a fetch from the page got back */
interface FetchResult {
    /** Response status */
    status: number;
    /** Response URL */
    url: string;
    /** Response headers as the page reads them */
    headers: Record<string, string>;
    /** Response body as text */
    body: string;
}

interface XhrRequest {
    /** Request URL */
    url: string;
    /** responseType the page asks for */
    responseType: XMLHttpRequestResponseType;
    /** Whether the page aborts the request right after send() */
    isAborted: boolean;
}

/** What an XHR from the page reported */
interface XhrResult {
    /** Status the request reports */
    status: number;
    /** URL of the response */
    responseUrl: string;
    /** The x-mocked response header */
    mockedHeader: Nullable<string>;
    /** xhr.response */
    response: unknown;
    /** Events in the order they fired; ready state changes carry the state */
    events: string[];
}

/** The interceptor as the browser will inject it: the built file, run before page scripts */
const INTERCEPTOR_PATH = join(EXTENSION_PATH, 'content', 'interceptor.js');

const PATHS = {
    USERS: '/api/users',
    ORDERS: '/api/orders',
    EMPTY: '/api/empty',
    SLOW: '/api/slow',
} as const;

const DELAY_MS = 400;

/** Timers may fire a little before the asked delay by the page's clock */
const TIMER_TOLERANCE_MS = 10;

const MOCKED_HEADER = { key: 'X-Mocked', value: 'yes', enabled: true };

const USERS_BODY = '{"users":[{"id":1}]}';

const USERS_MOCK: PageMock = {
    match: { url: { syntaxType: SyntaxTypes.FILTER, value: PATHS.USERS } },
    response: {
        status: 201,
        headers: [MOCKED_HEADER],
        bodyType: MockBodyTypes.JSON,
        body: USERS_BODY,
        delayMs: 0,
    },
};

const POST_ORDERS_MOCK: PageMock = {
    match: { url: { syntaxType: SyntaxTypes.FILTER, value: PATHS.ORDERS }, methods: [HttpMethods.POST] },
    response: { ...USERS_MOCK.response, body: '{"created":true}' },
};

const EMPTY_MOCK: PageMock = {
    match: { url: { syntaxType: SyntaxTypes.FILTER, value: PATHS.EMPTY } },
    response: { ...USERS_MOCK.response, status: 204, body: '' },
};

const SLOW_MOCK: PageMock = {
    match: { url: { syntaxType: SyntaxTypes.FILTER, value: PATHS.SLOW } },
    response: { ...USERS_MOCK.response, delayMs: DELAY_MS },
};

const MOCKS = [USERS_MOCK, POST_ORDERS_MOCK, EMPTY_MOCK, SLOW_MOCK];

const MOCK_LIST_MESSAGE: MockListMessage = {
    xr: 1,
    mocks: MOCKS,
};

const openInterceptedPage = async (context: BrowserContext, origin: string) => {
    const page = await context.newPage();

    await page.addInitScript({ path: INTERCEPTOR_PATH });

    await page.goto(origin + PAGE_PATH);

    return page;
};

/** Posts the mocks to the page the way the bridge does */
const postMocks = (page: Page) => page.evaluate(message => window.postMessage(message, '*'), MOCK_LIST_MESSAGE);

const fetchFromPage = (page: Page, url: string, method: string = HttpMethods.GET) =>
    page.evaluate<FetchResult, { url: string; method: string }>(
        async request => {
            const response = await fetch(request.url, { method: request.method });

            return {
                status: response.status,
                url: response.url,
                headers: Object.fromEntries(response.headers),
                body: await response.text(),
            };
        },
        { url, method },
    );

const sendXhr = (page: Page, request: XhrRequest) =>
    page.evaluate<XhrResult, XhrRequest>(async ({ url, responseType, isAborted }) => {
        const xhr = new XMLHttpRequest();
        const events: string[] = [];

        const onEvent = (event: Event) => {
            const isStateChange = event.type === 'readystatechange';

            events.push(isStateChange ? `${event.type} ${xhr.readyState}` : event.type);
        };

        for (const type of ['readystatechange', 'loadstart', 'progress', 'load', 'abort', 'loadend']) {
            xhr.addEventListener(type, onEvent);
        }

        /** Added after the recorder: between listeners of a real event the page's microtasks already run */
        const isDone = new Promise(resolve => xhr.addEventListener('loadend', resolve));

        xhr.open('GET', url);

        xhr.responseType = responseType;

        xhr.send();

        if (isAborted) {
            xhr.abort();
        }

        await isDone;

        return {
            status: xhr.status,
            responseUrl: xhr.responseURL,
            mockedHeader: xhr.getResponseHeader('x-mocked'),
            response: xhr.response,
            events,
        };
    }, request);

networkTest.describe('fetch', () => {
    networkTest('gets the status, headers and body of a matching mock', async ({ context, testServer }) => {
        const page = await openInterceptedPage(context, testServer.origin);

        await postMocks(page);

        expect(await fetchFromPage(page, PATHS.USERS)).toEqual({
            status: 201,
            url: testServer.origin + PATHS.USERS,
            headers: { 'x-mocked': 'yes', 'content-type': 'application/json' },
            body: USERS_BODY,
        });
    });

    networkTest('reaches the server without a matching mock', async ({ context, testServer }) => {
        const page = await openInterceptedPage(context, testServer.origin);

        await postMocks(page);

        const { body } = await fetchFromPage(page, PATHS.ORDERS);
        const echo: TestServerEcho = JSON.parse(body);

        expect(echo.path).toBe(PATHS.ORDERS);
    });

    networkTest('gets a mock with a method list only for those methods', async ({ context, testServer }) => {
        const page = await openInterceptedPage(context, testServer.origin);

        await postMocks(page);

        expect(await fetchFromPage(page, PATHS.ORDERS, HttpMethods.POST)).toMatchObject({ body: '{"created":true}' });

        expect(await fetchFromPage(page, PATHS.ORDERS, HttpMethods.GET)).toMatchObject({ status: 200 });
    });

    networkTest('gets no body and no content type from a 204 mock', async ({ context, testServer }) => {
        const page = await openInterceptedPage(context, testServer.origin);

        await postMocks(page);

        expect(await fetchFromPage(page, PATHS.EMPTY)).toMatchObject({
            status: 204,
            headers: { 'x-mocked': 'yes' },
            body: '',
        });
    });

    networkTest('sent before the mocks arrive, waits for them', async ({ context, testServer }) => {
        const page = await openInterceptedPage(context, testServer.origin);

        const status = await page.evaluate(
            async ({ path, message }) => {
                const pending = fetch(path);

                window.postMessage(message, '*');

                const response = await pending;

                return response.status;
            },
            { path: PATHS.USERS, message: MOCK_LIST_MESSAGE },
        );

        expect(status).toBe(201);
    });

    networkTest('waits for the delay of the mock', async ({ context, testServer }) => {
        const page = await openInterceptedPage(context, testServer.origin);

        await postMocks(page);

        const elapsedMs = await page.evaluate(async path => {
            const start = performance.now();

            await fetch(path);

            return performance.now() - start;
        }, PATHS.SLOW);

        expect(elapsedMs).toBeGreaterThanOrEqual(DELAY_MS - TIMER_TOLERANCE_MS);
    });

    networkTest('aborted during the delay, rejects with AbortError', async ({ context, testServer }) => {
        const page = await openInterceptedPage(context, testServer.origin);

        await postMocks(page);

        const errorName = await page.evaluate(async path => {
            const controller = new AbortController();
            const pending = fetch(path, { signal: controller.signal });

            controller.abort();

            try {
                await pending;

                return 'resolved';
            } catch (error) {
                return error instanceof DOMException ? error.name : String(error);
            }
        }, PATHS.SLOW);

        expect(errorName).toBe('AbortError');
    });
});

networkTest.describe('XMLHttpRequest', () => {
    networkTest('reports a matching mock like a real response', async ({ context, testServer }) => {
        const page = await openInterceptedPage(context, testServer.origin);

        await postMocks(page);

        const mocked = await sendXhr(page, { url: PATHS.USERS, responseType: 'json', isAborted: false });
        const real = await sendXhr(page, { url: PATHS.ORDERS, responseType: 'json', isAborted: false });

        expect(mocked).toMatchObject({
            status: 201,
            responseUrl: testServer.origin + PATHS.USERS,
            mockedHeader: 'yes',
            response: { users: [{ id: 1 }] },
        });

        expect(mocked.events).toEqual(real.events);
    });

    networkTest('reaches the server without a matching mock', async ({ context, testServer }) => {
        const page = await openInterceptedPage(context, testServer.origin);

        await postMocks(page);

        const result = await sendXhr(page, { url: PATHS.ORDERS, responseType: 'json', isAborted: false });

        expect(result).toMatchObject({ status: 200, mockedHeader: null, response: { path: PATHS.ORDERS } });
    });

    networkTest('aborted during the delay, fires the events of a real abort', async ({ context, testServer }) => {
        const page = await openInterceptedPage(context, testServer.origin);

        await postMocks(page);

        const mocked = await sendXhr(page, { url: PATHS.SLOW, responseType: '', isAborted: true });
        const real = await sendXhr(page, { url: PATHS.ORDERS, responseType: '', isAborted: true });

        expect(mocked).toMatchObject({ status: 0, response: '' });

        expect(mocked.events).toEqual(real.events);
    });
});
