import type { Page } from '@playwright/test';

import type { Environment } from '#entities/environment';
import {
    apiClientDatabase,
    historyStore,
    openRequestsStore,
    OPEN_REQUESTS_KEY,
    RequestBodyTypes,
} from '#entities/request';
import { API_CLIENT_CONFIG } from '#shared/config';
import { HttpMethods } from '#shared/lib';
import { RpcErrorCodes } from '#shared/messaging';

import { callBackground, expect, networkTest, REQUESTED_ORIGINS, stubAccessRequest, trackErrors } from './fixtures.ts';
import { FOREIGN_HOST, LOOPBACK_HOST, type TestServer } from './testServer.ts';

interface ApiClientFixtures {
    /** The API client in a new tab; the test fails if the page logs an error */
    apiClientPage: Page;
}

const API_CLIENT_PATH = 'pages/api-client.html';

/** Each test sends to its own path, so it reads back only its own requests from the shared server */
const PATHS = {
    PARAMS: '/api-client/params',
    JSON: '/api-client/json',
    COOKIES_OFF: '/api-client/cookies-off',
    COOKIES_ON: '/api-client/cookies-on',
    TABS: '/api-client/tabs',
    ENVIRONMENT: '/api-client/environment',
    HISTORY: '/api-client/history',
} as const;

/** Where the page keeps its database, for tests that read or fill it directly */
const DATABASE = {
    NAME: apiClientDatabase.name,
    HISTORY: historyStore.name,
    OPEN_REQUESTS: openRequestsStore.name,
    OPEN_REQUESTS_KEY,
} as const;

/** An old entry for the history, the way the page stores it */
const makeOldEntry = (index: number) => ({
    id: `old-${index}`,
    sentAt: index,
    request: {
        id: `old-${index}`,
        method: HttpMethods.GET,
        url: `https://old.test/${index}`,
        query: [],
        headers: [],
        body: { bodyType: RequestBodyTypes.NONE },
        sendCookies: false,
    },
    response: { status: 200, durationMs: 1, size: 1 },
});

/** Saved straight through the background, for tests that start with an environment */
const STAGING: Environment = {
    id: 'staging',
    name: 'Staging',
    variables: [{ key: 'token', value: 'abc', enabled: true, secret: true }],
};

const SESSION_COOKIE = {
    name: 'session',
    value: 'abc',
};

const apiClientTest = networkTest.extend<ApiClientFixtures>({
    apiClientPage: async ({ context, extensionId }, use) => {
        const page = await context.newPage();
        const errors = trackErrors(page);

        await page.goto(`chrome-extension://${extensionId}/${API_CLIENT_PATH}`);

        await use(page);

        expect(errors).toEqual([]);
    },
});

const getUrlField = (page: Page) => page.getByRole('textbox', { name: 'URL', exact: true });

const getResponsePanel = (page: Page) => page.getByRole('region', { name: 'Response' });

/** CodeMirror draws only the lines on the screen, so the test reads the top of the body there */
const getResponseBody = (page: Page) => getResponsePanel(page).getByRole('textbox', { name: 'Response body' });

const getTabBar = (page: Page) => page.getByRole('navigation', { name: 'Open requests' });

const openSection = async (page: Page, name: string) => {
    await page.getByRole('radio', { name, exact: true }).click();
};

/** Adds a row to the table on the screen and fills it in */
const addRow = async (page: Page, addLabel: string, keyLabel: string, key: string, value: string) => {
    await page.getByRole('button', { name: addLabel, exact: true }).click();

    await page.getByRole('textbox', { name: keyLabel, exact: true }).last().fill(key);

    await page.getByRole('textbox', { name: 'Value', exact: true }).last().fill(value);
};

const sendRequest = async (page: Page, url: string) => {
    await getUrlField(page).fill(url);

    await page.getByRole('button', { name: 'Send', exact: true }).click();
};

const getEnvironmentSelect = (page: Page) => page.getByRole('combobox', { name: 'Environment', exact: true });

/** Creates an environment in the editor: the first row is there already, the second one is a secret */
const createEnvironment = async (page: Page, baseUrl: string) => {
    await page.getByRole('button', { name: 'New environment', exact: true }).click();

    const editor = page.getByRole('dialog', { name: 'New environment' });
    const keys = editor.getByRole('textbox', { name: 'Variable', exact: true });
    const values = editor.getByRole('textbox', { name: 'Value', exact: true });

    await editor.getByRole('textbox', { name: 'Name', exact: true }).fill('Staging');

    await keys.first().fill('baseUrl');

    await values.first().fill(baseUrl);

    await editor.getByRole('button', { name: 'Add variable', exact: true }).click();

    await keys.last().fill('token');

    await values.last().fill('abc');

    await editor.getByRole('checkbox', { name: 'Secret', exact: true }).last().click();

    /** A secret is hidden while its field has no focus */
    await expect(values.last()).toHaveCSS('-webkit-text-security', 'disc');

    await editor.getByRole('button', { name: 'Save', exact: true }).click();

    await expect(editor).toBeHidden();
};

const getHistoryPanel = (page: Page) => page.getByRole('region', { name: 'History' });

/** Puts entries straight into the database of the page, which has created it by then */
const fillHistory = async (page: Page, entries: readonly object[]) => {
    await page.evaluate(
        async ({ database, records }) => {
            const connection = await new Promise<IDBDatabase>((resolve, reject) => {
                const request = indexedDB.open(database.NAME);

                request.addEventListener('success', () => resolve(request.result));
                request.addEventListener('error', () => reject(request.error));
            });

            const transaction = connection.transaction(database.HISTORY, 'readwrite');

            for (const record of records) {
                transaction.objectStore(database.HISTORY).put(record);
            }

            await new Promise((resolve, reject) => {
                transaction.addEventListener('complete', resolve);
                transaction.addEventListener('error', () => reject(transaction.error));
            });

            connection.close();
        },
        { database: DATABASE, records: entries },
    );
};

/** URLs of the open tabs as the page saved them */
const readSavedUrls = (page: Page) =>
    page.evaluate(async database => {
        const connection = await new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open(database.NAME);

            request.addEventListener('success', () => resolve(request.result));
            request.addEventListener('error', () => reject(request.error));
        });

        const record = await new Promise<{ requests: { url: string }[] } | undefined>((resolve, reject) => {
            const request = connection
                .transaction(database.OPEN_REQUESTS)
                .objectStore(database.OPEN_REQUESTS)
                .get(database.OPEN_REQUESTS_KEY);

            request.addEventListener('success', () => resolve(request.result));
            request.addEventListener('error', () => reject(request.error));
        });

        connection.close();

        return record?.requests.map(request => request.url) ?? [];
    }, DATABASE);

/** What reached the server at the path; polled, since the server answers a moment after the click */
const getReceived = (testServer: TestServer, path: string) => {
    return expect.poll(() => testServer.getLastRequest(path));
};

apiClientTest.describe('sending', () => {
    apiClientTest('sends parameters and headers and shows the response', async ({ apiClientPage, testServer }) => {
        await addRow(apiClientPage, 'Add parameter', 'Parameter', 'page', '2');

        await openSection(apiClientPage, 'Headers');

        await addRow(apiClientPage, 'Add header', 'Header', 'X-Trace', 'e2e');

        await sendRequest(apiClientPage, testServer.origin + PATHS.PARAMS);

        await getReceived(testServer, `${PATHS.PARAMS}?page=2`).toMatchObject({
            method: 'GET',
            headers: { 'x-trace': 'e2e' },
            body: '',
        });

        await expect(getResponsePanel(apiClientPage).getByText('200 OK', { exact: true })).toBeVisible();

        await expect(getResponseBody(apiClientPage)).toContainText('"method": "GET"');

        expect(testServer.getLastRequest(`${PATHS.PARAMS}?page=2`)?.headers).not.toHaveProperty('referer');
    });

    apiClientTest('sends a JSON body with its content type', async ({ apiClientPage, testServer }) => {
        await apiClientPage.getByRole('combobox', { name: 'Method', exact: true }).selectOption('POST');

        await openSection(apiClientPage, 'Body');

        await openSection(apiClientPage, 'JSON');

        await apiClientPage.getByRole('textbox', { name: 'Request body' }).fill('{"name":"Ada"}');

        await sendRequest(apiClientPage, testServer.origin + PATHS.JSON);

        await getReceived(testServer, PATHS.JSON).toMatchObject({
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: '{"name":"Ada"}',
        });
    });

    apiClientTest(
        'sends the cookies of the site only when turned on',
        async ({ apiClientPage, context, testServer }) => {
            await context.addCookies([{ ...SESSION_COOKIE, url: testServer.origin }]);

            await sendRequest(apiClientPage, testServer.origin + PATHS.COOKIES_OFF);

            await getReceived(testServer, PATHS.COOKIES_OFF).toBeDefined();

            expect(testServer.getLastRequest(PATHS.COOKIES_OFF)?.headers).not.toHaveProperty('cookie');

            await openSection(apiClientPage, 'Settings');

            await apiClientPage.getByRole('switch', { name: "Send the site's cookies" }).click();

            await sendRequest(apiClientPage, testServer.origin + PATHS.COOKIES_ON);

            await getReceived(testServer, PATHS.COOKIES_ON).toMatchObject({ headers: { cookie: 'session=abc' } });
        },
    );

    apiClientTest('names the headers that the browser drops', async ({ apiClientPage }) => {
        await openSection(apiClientPage, 'Headers');

        await addRow(apiClientPage, 'Add header', 'Header', 'Cookie', 'a=1');

        await expect(apiClientPage.getByText("so they aren't sent: Cookie.")).toBeVisible();
    });
});

apiClientTest.describe('host access', () => {
    apiClientTest('asks for the host a request goes to', async ({ apiClientPage, testServer }) => {
        await apiClientPage.evaluate(stubAccessRequest);

        await sendRequest(apiClientPage, testServer.foreignOrigin + PATHS.PARAMS);

        await expect(getResponsePanel(apiClientPage)).toContainText(`InterceptKit has no access to ${FOREIGN_HOST}`);

        await expect(apiClientPage.locator('body')).toHaveAttribute(REQUESTED_ORIGINS, `*://${FOREIGN_HOST}/*`);
    });
});

apiClientTest.describe('tabs', () => {
    apiClientTest('keep a request in each tab', async ({ apiClientPage, testServer }) => {
        const tabs = getTabBar(apiClientPage);
        const firstUrl = testServer.origin + PATHS.TABS;

        await getUrlField(apiClientPage).fill(firstUrl);

        await tabs.getByRole('button', { name: 'Open a new request' }).click();

        await expect(getUrlField(apiClientPage)).toHaveValue('');

        await tabs.getByRole('button', { name: `GET ${LOOPBACK_HOST}` }).click();

        await expect(getUrlField(apiClientPage)).toHaveValue(firstUrl);

        await tabs.getByRole('button', { name: 'Close New request' }).click();

        await expect(tabs.getByRole('listitem')).toHaveCount(1);
    });

    apiClientTest('open an empty tab after the last one closes', async ({ apiClientPage }) => {
        const tabs = getTabBar(apiClientPage);

        await getUrlField(apiClientPage).fill('https://api.example.com');

        await tabs.getByRole('button', { name: 'Close api.example.com' }).click();

        await expect(tabs.getByRole('listitem')).toHaveCount(1);

        await expect(getUrlField(apiClientPage)).toHaveValue('');
    });
});

apiClientTest.describe('environments', () => {
    apiClientTest('fill the variables of the chosen environment', async ({ apiClientPage, testServer }) => {
        await openSection(apiClientPage, 'Environments');

        await createEnvironment(apiClientPage, testServer.origin);

        await expect(apiClientPage.getByRole('region', { name: 'Environments' })).toContainText('Staging');

        await getEnvironmentSelect(apiClientPage).selectOption({ label: 'Staging' });

        await openSection(apiClientPage, 'Headers');

        await addRow(apiClientPage, 'Add header', 'Header', 'Authorization', 'Bearer {{token}}');

        await sendRequest(apiClientPage, `{{baseUrl}}${PATHS.ENVIRONMENT}`);

        await getReceived(testServer, PATHS.ENVIRONMENT).toMatchObject({ headers: { authorization: 'Bearer abc' } });

        await expect(getTabBar(apiClientPage).getByRole('button', { name: 'GET {{baseUrl}}' })).toBeVisible();
    });

    apiClientTest('name the variables that have no value', async ({ apiClientPage }) => {
        await sendRequest(apiClientPage, '{{baseUrl}}/users/{{id}}');

        await expect(getResponsePanel(apiClientPage)).toContainText('No value for baseUrl, id');
    });

    apiClientTest('keep the choice after a reload until the environment is deleted', async ({ apiClientPage }) => {
        await callBackground(apiClientPage, 'environments/save', STAGING);

        await callBackground(apiClientPage, 'environments/choose', { activeId: STAGING.id });

        await apiClientPage.reload();

        await expect(getEnvironmentSelect(apiClientPage)).toHaveValue(STAGING.id);

        await openSection(apiClientPage, 'Environments');

        await apiClientPage.getByRole('button', { name: 'Delete Staging', exact: true }).click();

        await apiClientPage
            .getByRole('dialog', { name: 'Delete environment?' })
            .getByRole('button', { name: 'Delete environment', exact: true })
            .click();

        await expect(getEnvironmentSelect(apiClientPage)).toHaveValue('');

        await expect(apiClientPage.getByText('An environment keeps values')).toBeVisible();
    });

    apiClientTest('refuse a choice of an environment that does not exist', async ({ apiClientPage }) => {
        const answer = await callBackground(apiClientPage, 'environments/choose', { activeId: 'missing' });

        expect(answer).toMatchObject({ ok: false, error: { code: RpcErrorCodes.BAD_REQUEST } });
    });
});

apiClientTest.describe('history', () => {
    apiClientTest('keeps a sent request and opens it in a new tab', async ({ apiClientPage, testServer }) => {
        const history = getHistoryPanel(apiClientPage);
        const url = testServer.origin + PATHS.HISTORY;

        await sendRequest(apiClientPage, url);

        await expect(history.getByRole('listitem')).toHaveCount(1);

        await expect(history.getByRole('listitem')).toContainText(`GET${LOOPBACK_HOST}`);

        await expect(history.getByRole('listitem')).toContainText('200');

        await getTabBar(apiClientPage)
            .getByRole('button', { name: `Close ${LOOPBACK_HOST}`, exact: false })
            .click();

        await history.getByRole('button', { name: new RegExp(PATHS.HISTORY) }).click();

        await expect(getUrlField(apiClientPage)).toHaveValue(url);

        await expect(getTabBar(apiClientPage).getByRole('listitem')).toHaveCount(2);
    });

    apiClientTest('clears the history once the user confirms', async ({ apiClientPage, testServer }) => {
        const history = getHistoryPanel(apiClientPage);

        await sendRequest(apiClientPage, testServer.origin + PATHS.HISTORY);

        await expect(history.getByRole('listitem')).toHaveCount(1);

        await history.getByRole('button', { name: 'Clear history', exact: true }).click();

        await apiClientPage
            .getByRole('dialog', { name: 'Clear the history?' })
            .getByRole('button', { name: 'Clear history', exact: true })
            .click();

        await expect(history.getByRole('listitem')).toHaveCount(0);
    });

    apiClientTest('drops the oldest requests beyond the limit', async ({ apiClientPage, testServer }) => {
        const history = getHistoryPanel(apiClientPage);
        const oldEntries = Array.from({ length: API_CLIENT_CONFIG.HISTORY_LIMIT }, (_, index) => makeOldEntry(index));

        await expect(history).toBeVisible();

        await fillHistory(apiClientPage, oldEntries);

        await sendRequest(apiClientPage, testServer.origin + PATHS.HISTORY);

        await expect(history.getByRole('listitem').first()).toContainText(PATHS.HISTORY);

        await expect(history.getByRole('listitem')).toHaveCount(API_CLIENT_CONFIG.HISTORY_LIMIT);

        await expect(history.getByText('old.test/0', { exact: true })).toHaveCount(0);
    });

    apiClientTest('keeps the open tabs after a reload', async ({ apiClientPage }) => {
        const tabs = getTabBar(apiClientPage);

        await getUrlField(apiClientPage).fill('https://one.test');

        await tabs.getByRole('button', { name: 'Open a new request' }).click();

        await getUrlField(apiClientPage).fill('https://two.test');

        await expect.poll(() => readSavedUrls(apiClientPage)).toEqual(['https://one.test', 'https://two.test']);

        await apiClientPage.reload();

        await expect(tabs.getByRole('listitem')).toHaveCount(2);

        await expect(getUrlField(apiClientPage)).toHaveValue('https://two.test');
    });
});
