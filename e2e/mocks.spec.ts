import type { BrowserContext, Locator, Page, Worker } from '@playwright/test';

import { MOCK_SCRIPTS, MockBodyTypes, type Mock } from '#entities/mock';
import { ScriptWorlds, Sources, SyntaxTypes } from '#shared/lib';
import { RpcErrorCodes } from '#shared/messaging';

import { callBackground, expect, networkTest, openSection } from './fixtures.ts';
import {
    EARLY_PAGE_PATH,
    EARLY_REQUEST_PATH,
    EARLY_STATUS_ATTRIBUTE,
    LOOPBACK_HOST,
    PAGE_PATH,
    type TestServerEcho,
} from './testServer.ts';

/** What a fetch from the page got back */
interface FetchResult {
    /** Response status */
    status: number;
    /** Response body as text */
    body: string;
}

/** The copy of the build holds this pattern from install, as if the Sites section had granted it */
const TEST_SITE_PATTERN = `http://${LOOPBACK_HOST}/*`;

const USERS_PATH = '/api/users';

const USERS_BODY = '{"users":[]}';

const makeMock = (overrides: Partial<Mock> = {}): Mock => ({
    id: 'users',
    name: 'Users',
    enabled: true,
    source: Sources.USER,
    match: { url: { syntaxType: SyntaxTypes.FILTER, value: USERS_PATH } },
    response: {
        status: 201,
        headers: [],
        bodyType: MockBodyTypes.JSON,
        body: USERS_BODY,
        delayMs: 0,
    },
    ...overrides,
});

const USERS_MOCK = makeMock();

const EARLY_MOCK = makeMock({
    id: 'early',
    name: 'Early',
    match: { url: { syntaxType: SyntaxTypes.FILTER, value: EARLY_REQUEST_PATH } },
});

const REGISTERED_SCRIPTS = [
    { id: 'interceptkit-interceptor', js: ['content/interceptor.js'], world: ScriptWorlds.MAIN },
    { id: 'interceptkit-bridge', js: ['content/bridge.js'], world: ScriptWorlds.ISOLATED },
].map(script => ({ ...script, matches: [TEST_SITE_PATTERN], runAt: 'document_start', allFrames: true }));

const getRegisteredScripts = (serviceWorker: Worker) =>
    serviceWorker.evaluate(() => chrome.scripting.getRegisteredContentScripts());

const setSiteMocks = (page: Page, mocks: boolean) =>
    callBackground(page, 'sites/setMocks', { pattern: TEST_SITE_PATTERN, mocks });

/** Turns mocks on for the test server and saves the mock; done once the browser has the scripts */
const enableMock = async (page: Page, serviceWorker: Worker, mock: Mock) => {
    expect(await setSiteMocks(page, true)).toMatchObject({ ok: true });

    expect(await callBackground(page, 'mocks/save', mock)).toMatchObject({ ok: true });

    await expect.poll(() => getRegisteredScripts(serviceWorker)).toHaveLength(MOCK_SCRIPTS.length);
};

/** Blocked or mocked requests may log to the console, so the site page does not track errors */
const openSitePage = async (context: BrowserContext, url: string) => {
    const page = await context.newPage();

    await page.goto(url);

    return page;
};

const fetchFromPage = (page: Page, path: string) =>
    page.evaluate<FetchResult, string>(async url => {
        const response = await fetch(url);

        return {
            status: response.status,
            body: await response.text(),
        };
    }, path);

const parseEcho = (result: FetchResult): TestServerEcho => JSON.parse(result.body);

networkTest(
    'mocks register both scripts on the granted site before page scripts',
    async ({ optionsPage, serviceWorker }) => {
        await enableMock(optionsPage, serviceWorker, USERS_MOCK);

        expect(await getRegisteredScripts(serviceWorker)).toMatchObject(REGISTERED_SCRIPTS);
    },
);

networkTest('a page of the site gets the mock', async ({ context, optionsPage, serviceWorker, testServer }) => {
    await enableMock(optionsPage, serviceWorker, USERS_MOCK);

    const page = await openSitePage(context, testServer.origin + PAGE_PATH);

    expect(await fetchFromPage(page, USERS_PATH)).toEqual({ status: 201, body: USERS_BODY });
});

networkTest(
    'a request the page sends while it parses gets the mock',
    async ({ context, optionsPage, serviceWorker, testServer }) => {
        await enableMock(optionsPage, serviceWorker, EARLY_MOCK);

        const page = await openSitePage(context, testServer.origin + EARLY_PAGE_PATH);

        await expect(page.locator('html')).toHaveAttribute(EARLY_STATUS_ATTRIBUTE, '201');
    },
);

networkTest(
    'a page of a site without mocks reaches the server',
    async ({ context, optionsPage, serviceWorker, testServer }) => {
        await enableMock(optionsPage, serviceWorker, USERS_MOCK);

        const page = await openSitePage(context, testServer.foreignOrigin + PAGE_PATH);
        const result = await fetchFromPage(page, USERS_PATH);

        expect(parseEcho(result).path).toBe(USERS_PATH);
    },
);

networkTest(
    'switching mocks off for the site takes the scripts away',
    async ({ context, optionsPage, serviceWorker, testServer }) => {
        await enableMock(optionsPage, serviceWorker, USERS_MOCK);

        expect(await setSiteMocks(optionsPage, false)).toMatchObject({ ok: true });

        await expect.poll(() => getRegisteredScripts(serviceWorker)).toEqual([]);

        const page = await openSitePage(context, testServer.origin + PAGE_PATH);

        expect(await fetchFromPage(page, USERS_PATH)).toMatchObject({ status: 200 });
    },
);

networkTest('the interception switch takes the scripts away', async ({ optionsPage, serviceWorker }) => {
    await enableMock(optionsPage, serviceWorker, USERS_MOCK);

    expect(await callBackground(optionsPage, 'settings/update', { enabled: false })).toMatchObject({ ok: true });

    await expect.poll(() => getRegisteredScripts(serviceWorker)).toEqual([]);
});

networkTest.describe('the background refuses', () => {
    networkTest('page mocks to anything but a content script', async ({ optionsPage }) => {
        expect(await callBackground(optionsPage, 'mocks/forPage', null)).toMatchObject({
            ok: false,
            error: { code: RpcErrorCodes.FORBIDDEN },
        });
    });

    networkTest('mocks for a site the browser has not granted', async ({ optionsPage }) => {
        const site = { pattern: '*://*.example.com/*', mocks: true };

        expect(await callBackground(optionsPage, 'sites/setMocks', site)).toMatchObject({
            ok: false,
            error: { code: RpcErrorCodes.BAD_REQUEST },
        });
    });

    networkTest('a mock that claims to come from the policy', async ({ optionsPage }) => {
        const policyMock = makeMock({ source: Sources.POLICY });

        expect(await callBackground(optionsPage, 'mocks/save', policyMock)).toMatchObject({
            ok: false,
            error: { code: RpcErrorCodes.FORBIDDEN },
        });
    });
});

/** Name of the section in the sidebar and its heading */
const MOCKS_SECTION = 'Mock API';

const SITE_MOCKS_SWITCH = `Mocks on http://${LOOPBACK_HOST}`;

/** Controls sit inside their labels, so look them up by role */
const getTextbox = (scope: Locator, name: string) => scope.getByRole('textbox', { name, exact: true });

const getMockRow = (page: Page, name: string) => page.getByRole('listitem').filter({ hasText: name });

const createMockInEditor = async (page: Page) => {
    await page.getByRole('button', { name: 'New mock' }).first().click();

    const editor = page.getByRole('dialog', { name: 'New mock' });

    await getTextbox(editor, 'Name').fill('Users');

    await getTextbox(editor, 'URL pattern').fill(USERS_PATH);

    await editor.getByRole('spinbutton', { name: 'Status', exact: true }).fill('201');

    await getTextbox(editor, 'Body').fill(USERS_BODY);

    await editor.getByRole('button', { name: 'Save' }).click();

    await expect(editor).toBeHidden();
};

const openNewMock = async (page: Page) => {
    await openSection(page, MOCKS_SECTION);

    await page.getByRole('button', { name: 'New mock' }).first().click();

    return page.getByRole('dialog', { name: 'New mock' });
};

networkTest.describe('the body editor', () => {
    networkTest('gets its styles under the strict policy of extension pages', async ({ optionsPage }) => {
        const editor = await openNewMock(optionsPage);

        /** Without its styles CodeMirror falls back to block layout; console errors would fail the fixture */
        await expect(editor.locator('.cm-editor')).toHaveCSS('display', 'flex');
    });

    networkTest('marks the place where a JSON body stops parsing', async ({ optionsPage }) => {
        const editor = await openNewMock(optionsPage);

        await getTextbox(editor, 'Body').fill('{"users": [1, 2,]}');

        await expect(editor.locator('.cm-lint-marker-error')).toBeVisible();

        /** JSON.parse names no position for a trailing comma; the syntax tree does */
        await expect(editor.locator('.cm-lintRange-error')).toHaveText(']');

        await expect(editor.getByRole('button', { name: 'Format' })).toBeDisabled();
    });

    /** Chrome would lay such text out itself with inline styles; the fixture fails on the CSP error that follows */
    networkTest('takes text that spans lines without breaking the page policy', async ({ optionsPage }) => {
        const editor = await openNewMock(optionsPage);
        const body = getTextbox(editor, 'Body');

        await body.fill('{\n    "a": 1\n}');

        await expect(editor.locator('.cm-line')).toHaveText(['{', '    "a": 1', '}']);

        await optionsPage.keyboard.press('ControlOrMeta+A');

        await optionsPage.keyboard.type('x');

        await expect(editor.locator('.cm-line')).toHaveText(['x']);
    });

    networkTest('lays out a JSON body with the format button', async ({ optionsPage }) => {
        const editor = await openNewMock(optionsPage);

        await getTextbox(editor, 'Body').fill('{"users":[1,2]}');

        await editor.getByRole('button', { name: 'Format' }).click();

        await expect(editor.locator('.cm-line')).toHaveText([
            '{',
            '    "users": [',
            '        1,',
            '        2',
            '    ]',
            '}',
        ]);

        await expect(editor.getByRole('button', { name: 'Format' })).toBeDisabled();
    });
});

networkTest.describe('the dashboard', () => {
    networkTest(
        'turns mocks on for a site and creates a mock that its pages get',
        async ({ context, optionsPage, serviceWorker, testServer }) => {
            const siteMocks = optionsPage.getByRole('switch', { name: SITE_MOCKS_SWITCH });

            await openSection(optionsPage, 'Sites');

            await siteMocks.click();

            await expect(siteMocks).toBeChecked();

            await openSection(optionsPage, MOCKS_SECTION);

            await expect(optionsPage.getByText('No mocks yet', { exact: true })).toBeVisible();

            await createMockInEditor(optionsPage);

            await expect(getMockRow(optionsPage, 'Users')).toContainText(USERS_PATH);

            await expect.poll(() => getRegisteredScripts(serviceWorker)).toHaveLength(MOCK_SCRIPTS.length);

            const page = await openSitePage(context, testServer.origin + PAGE_PATH);

            expect(await fetchFromPage(page, USERS_PATH)).toEqual({ status: 201, body: USERS_BODY });
        },
    );

    networkTest('warns about secrets and asks to turn mocks on for a site', async ({ optionsPage }) => {
        await openSection(optionsPage, MOCKS_SECTION);

        await expect(optionsPage.getByText("don't put tokens, passwords or other secrets")).toBeVisible();

        await expect(optionsPage.getByText('Mocks work only on sites where you turn them on')).toBeVisible();

        await optionsPage.getByRole('link', { name: 'Turn on for a site' }).click();

        await expect(optionsPage.getByRole('heading', { level: 1, name: 'Sites' })).toBeVisible();
    });

    networkTest('switches a mock off and deletes it', async ({ optionsPage, serviceWorker }) => {
        const mockSwitch = optionsPage.getByRole('switch', { name: 'Users' });

        await enableMock(optionsPage, serviceWorker, USERS_MOCK);

        await openSection(optionsPage, MOCKS_SECTION);

        await mockSwitch.click();

        await expect(mockSwitch).not.toBeChecked();

        await expect.poll(() => getRegisteredScripts(serviceWorker)).toEqual([]);

        await getMockRow(optionsPage, 'Users').getByRole('button', { name: 'Delete' }).click();

        await optionsPage.getByRole('dialog', { name: 'Delete mock?' }).getByRole('button', { name: 'Delete' }).click();

        await expect(optionsPage.getByText('No mocks yet', { exact: true })).toBeVisible();
    });
});
