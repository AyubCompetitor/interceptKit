import type { BrowserContext, Page, Worker } from '@playwright/test';

import { HeaderOperations, RuleTargetTypes, RuleTypes, type RedirectTarget, type Rule } from '#entities/rule';
import { Sources, SyntaxTypes, type UrlPattern } from '#shared/lib';

import { callBackground, expect, getDynamicRules, networkTest } from './fixtures.ts';
import { PAGE_PATH, type TestServerEcho } from './testServer.ts';

/** What a fetch from a page got back */
interface FetchResult {
    /** What reached the server */
    echo: TestServerEcho;
    /** Response headers as the page reads them */
    headers: Record<string, string>;
}

interface RedirectCase {
    /** Kind of the redirect target, for the test name */
    name: string;
    /** Condition on the request URL */
    pattern: UrlPattern;
    /** The target; the test server's port is known only at run time */
    getTarget: (origin: string) => RedirectTarget;
}

const PATHS = {
    BLOCKED: '/api/blocked',
    ALLOWED: '/api/allowed',
    OLD: '/api/old',
    NEW: '/api/new',
    ECHO: '/api/echo',
} as const;

/** What a fetch rejects with when the browser cancels the request */
const FETCH_FAILED = 'Failed to fetch';

const BLOCKED_BY_CLIENT = 'net::ERR_BLOCKED_BY_CLIENT';

const BLOCK_RULE: Rule = {
    id: 'blocked-api',
    name: 'Block the API',
    enabled: true,
    source: Sources.USER,
    type: RuleTypes.BLOCK,
    match: {
        url: {
            syntaxType: SyntaxTypes.FILTER,
            value: PATHS.BLOCKED,
        },
    },
};

const HEADER_RULE: Rule = {
    id: 'debug-headers',
    name: 'Debug headers',
    enabled: true,
    source: Sources.USER,
    type: RuleTypes.HEADERS,
    match: {
        url: {
            syntaxType: SyntaxTypes.FILTER,
            value: PATHS.ECHO,
        },
    },
    request: [
        {
            name: 'X-Debug',
            operation: HeaderOperations.SET,
            value: '1',
        },
    ],
    response: [
        {
            name: 'X-Intercepted',
            operation: HeaderOperations.SET,
            value: 'yes',
        },
        {
            name: 'X-Powered-By',
            operation: HeaderOperations.REMOVE,
        },
    ],
};

const OLD_PATH_FILTER: UrlPattern = {
    syntaxType: SyntaxTypes.FILTER,
    value: PATHS.OLD,
};

const OLD_PATH_RGX: UrlPattern = {
    syntaxType: SyntaxTypes.RGX,
    value: `^(http://[^/]+)${PATHS.OLD}$`,
};

const REDIRECT_CASES: RedirectCase[] = [
    {
        name: 'a URL',
        pattern: OLD_PATH_FILTER,
        getTarget: origin => ({ targetType: RuleTargetTypes.URL, url: origin + PATHS.NEW }),
    },
    {
        name: 'a regex substitution',
        pattern: OLD_PATH_RGX,
        getTarget: () => ({ targetType: RuleTargetTypes.RGX_SUBSTITUTION, value: `\\1${PATHS.NEW}` }),
    },
    {
        name: 'a URL transform',
        pattern: OLD_PATH_FILTER,
        getTarget: () => ({ targetType: RuleTargetTypes.TRANSFORM, path: PATHS.NEW }),
    },
];

const makeRedirectRule = (pattern: UrlPattern, to: RedirectTarget): Rule => ({
    id: 'new-api',
    name: 'Move the API',
    enabled: true,
    source: Sources.USER,
    type: RuleTypes.REDIRECT,
    match: { url: pattern },
    to,
});

/** Saves a rule and waits for it in the browser: only then does it act on requests */
const saveRule = async (page: Page, serviceWorker: Worker, rule: Rule) => {
    expect(await callBackground(page, 'rules/save', rule)).toMatchObject({ ok: true });

    await expect.poll(() => getDynamicRules(serviceWorker)).toHaveLength(1);
};

/** Blocked requests log errors to the console, so the test page does not track them */
const openTestPage = async (context: BrowserContext, origin: string) => {
    const page = await context.newPage();

    await page.goto(origin + PAGE_PATH);

    return page;
};

/** Fetches a URL the way the page's own scripts do */
const fetchFromPage = (page: Page, url: string) =>
    page.evaluate<FetchResult, string>(async requestUrl => {
        const response = await fetch(requestUrl);

        return {
            echo: await response.json(),
            headers: Object.fromEntries(response.headers),
        };
    }, url);

networkTest.describe('a block rule', () => {
    networkTest('cancels a fetch and a navigation', async ({ context, optionsPage, serviceWorker, testServer }) => {
        await saveRule(optionsPage, serviceWorker, BLOCK_RULE);

        const page = await openTestPage(context, testServer.origin);

        await expect(fetchFromPage(page, PATHS.BLOCKED)).rejects.toThrow(FETCH_FAILED);

        /** A failed navigation shows that the rule covers main_frame */
        await expect(page.goto(testServer.origin + PATHS.BLOCKED)).rejects.toThrow(BLOCKED_BY_CLIENT);
    });

    networkTest('lets another path through', async ({ context, optionsPage, serviceWorker, testServer }) => {
        await saveRule(optionsPage, serviceWorker, BLOCK_RULE);

        const page = await openTestPage(context, testServer.origin);

        expect(await fetchFromPage(page, PATHS.ALLOWED)).toMatchObject({ echo: { path: PATHS.ALLOWED } });
    });

    networkTest(
        'does not act on a page from a host without access',
        async ({ context, optionsPage, serviceWorker, testServer }) => {
            const blockedUrl = testServer.origin + PATHS.BLOCKED;

            await saveRule(optionsPage, serviceWorker, BLOCK_RULE);

            const page = await openTestPage(context, testServer.origin);
            const foreignPage = await openTestPage(context, testServer.foreignOrigin);

            await expect(fetchFromPage(page, blockedUrl)).rejects.toThrow(FETCH_FAILED);

            expect(await fetchFromPage(foreignPage, blockedUrl)).toMatchObject({ echo: { path: PATHS.BLOCKED } });
        },
    );
});

for (const { name, pattern, getTarget } of REDIRECT_CASES) {
    networkTest(
        `a redirect to ${name} sends the request to the new path`,
        async ({ context, optionsPage, serviceWorker, testServer }) => {
            await saveRule(optionsPage, serviceWorker, makeRedirectRule(pattern, getTarget(testServer.origin)));

            const page = await openTestPage(context, testServer.origin);

            expect(await fetchFromPage(page, PATHS.OLD)).toMatchObject({ echo: { path: PATHS.NEW } });
        },
    );
}

networkTest(
    'a header rule changes request and response headers',
    async ({ context, optionsPage, serviceWorker, testServer }) => {
        const page = await openTestPage(context, testServer.origin);
        const before = await fetchFromPage(page, PATHS.ECHO);

        await saveRule(optionsPage, serviceWorker, HEADER_RULE);

        const after = await fetchFromPage(page, PATHS.ECHO);

        expect(before.headers).toMatchObject({ 'x-powered-by': 'test-server' });

        expect(after.echo.headers).toMatchObject({ 'x-debug': '1' });

        expect(after.headers).toMatchObject({ 'x-intercepted': 'yes' });

        expect(after.headers).not.toHaveProperty('x-powered-by');
    },
);
