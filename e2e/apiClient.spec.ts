import type { Page } from '@playwright/test';

import { expect, networkTest, REQUESTED_ORIGINS, stubAccessRequest, trackErrors } from './fixtures.ts';
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
} as const;

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
