import type { Page } from '@playwright/test';

import { VAULT_LOCK_ALARM, type Environment } from '#entities/environment';
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
    VAULT_UNLOCKED: '/api-client/vault-unlocked',
    VAULT_OPENED: '/api-client/vault-opened',
    CURL: '/api-client/curl',
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

const MASTER_PASSWORD = 'correct horse battery';

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

/** Values of every stored variable, the way the background keeps them */
const readStoredValues = (page: Page) =>
    page.evaluate(async () => {
        const { environments } = await chrome.storage.local.get<{ environments: Environment[] }>('environments');

        return environments.flatMap(environment => environment.variables.map(variable => variable.value));
    });

const getVaultButton = (page: Page, name: string) => page.getByRole('button', { name, exact: true });

/** The chosen environment with the secret token, and a request that sends it */
const prepareSecretRequest = async (page: Page) => {
    await callBackground(page, 'environments/save', STAGING);

    await callBackground(page, 'environments/choose', { activeId: STAGING.id });

    await openSection(page, 'Headers');

    await addRow(page, 'Add header', 'Header', 'Authorization', 'Bearer {{token}}');
};

const createVault = async (page: Page) => {
    await callBackground(page, 'vault/create', { password: MASTER_PASSWORD });

    await expect(getVaultButton(page, 'Lock secrets')).toBeVisible();
};

const lockVault = async (page: Page) => {
    await callBackground(page, 'vault/lock', null);

    await expect(getVaultButton(page, 'Unlock secrets')).toBeVisible();
};

const submitPassword = async (page: Page, dialogName: string, submitName: string, password: string) => {
    const dialog = page.getByRole('dialog', { name: dialogName });

    await dialog.getByLabel('Master password', { exact: true }).fill(password);

    await dialog.getByRole('button', { name: submitName, exact: true }).click();
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

apiClientTest.describe('vault', () => {
    apiClientTest('encrypts the secrets and fills them in while unlocked', async ({ apiClientPage, testServer }) => {
        await prepareSecretRequest(apiClientPage);

        await getVaultButton(apiClientPage, 'Encrypt secrets').click();

        const setup = apiClientPage.getByRole('dialog', { name: 'Encrypt secrets' });

        await setup.getByLabel('Master password', { exact: true }).fill(MASTER_PASSWORD);

        await setup.getByLabel('Repeat the password', { exact: true }).fill('another password');

        await setup.getByRole('button', { name: 'Encrypt', exact: true }).click();

        await expect(setup.getByRole('alert')).toHaveText('The passwords do not match.');

        await setup.getByLabel('Repeat the password', { exact: true }).fill(MASTER_PASSWORD);

        await setup.getByRole('button', { name: 'Encrypt', exact: true }).click();

        await expect(setup).toBeHidden();

        await expect.poll(() => readStoredValues(apiClientPage)).toEqual([expect.objectContaining({ v: 1 })]);

        await sendRequest(apiClientPage, `${testServer.origin}${PATHS.VAULT_UNLOCKED}`);

        await getReceived(testServer, PATHS.VAULT_UNLOCKED).toMatchObject({ headers: { authorization: 'Bearer abc' } });

        await getVaultButton(apiClientPage, 'Lock secrets').click();

        await expect(getVaultButton(apiClientPage, 'Unlock secrets')).toBeVisible();

        await apiClientPage.getByRole('button', { name: 'Send', exact: true }).click();

        await expect(getResponsePanel(apiClientPage)).toContainText('encrypted variables have no value: token');
    });

    apiClientTest('unlocks with the right password only', async ({ apiClientPage, testServer }) => {
        await prepareSecretRequest(apiClientPage);

        await createVault(apiClientPage);

        await lockVault(apiClientPage);

        await getVaultButton(apiClientPage, 'Unlock secrets').click();

        await submitPassword(apiClientPage, 'Unlock secrets', 'Unlock', 'wrong horse');

        const unlockDialog = apiClientPage.getByRole('dialog', { name: 'Unlock secrets' });

        await expect(unlockDialog.getByRole('alert')).toHaveText('Wrong password.');

        await submitPassword(apiClientPage, 'Unlock secrets', 'Unlock', MASTER_PASSWORD);

        await expect(getVaultButton(apiClientPage, 'Lock secrets')).toBeVisible();

        await sendRequest(apiClientPage, `${testServer.origin}${PATHS.VAULT_OPENED}`);

        await getReceived(testServer, PATHS.VAULT_OPENED).toMatchObject({ headers: { authorization: 'Bearer abc' } });
    });

    apiClientTest('locks itself once the idle time runs out', async ({ apiClientPage, serviceWorker }) => {
        await createVault(apiClientPage);

        const alarm = await serviceWorker.evaluate(name => chrome.alarms.get(name), VAULT_LOCK_ALARM);

        expect(alarm?.scheduledTime).toBeGreaterThan(Date.now() + 14 * 60_000);

        /** The alarm of an unpacked extension may fire at once, so the test moves the idle time into the past */
        await serviceWorker.evaluate(async name => {
            await chrome.storage.session.set({ vaultStatus: { unlockedUntil: Date.now() - 1 } });

            await chrome.alarms.create(name, { when: Date.now() });
        }, VAULT_LOCK_ALARM);

        await expect
            .poll(() => serviceWorker.evaluate(() => chrome.storage.session.get(null)))
            .toEqual({
                vaultKey: {},
                vaultStatus: {},
            });

        await expect(getVaultButton(apiClientPage, 'Unlock secrets')).toBeVisible();
    });

    apiClientTest('refuses a typed secret while locked', async ({ apiClientPage }) => {
        await createVault(apiClientPage);

        await lockVault(apiClientPage);

        const answer = await callBackground(apiClientPage, 'environments/save', STAGING);

        expect(answer).toMatchObject({ ok: false, error: { code: RpcErrorCodes.FORBIDDEN } });
    });

    apiClientTest('turns off with the password and keeps the secrets as typed', async ({ apiClientPage }) => {
        await callBackground(apiClientPage, 'environments/save', STAGING);

        await createVault(apiClientPage);

        await expect.poll(() => readStoredValues(apiClientPage)).toEqual([expect.objectContaining({ v: 1 })]);

        await getVaultButton(apiClientPage, 'Turn off encryption').click();

        await submitPassword(apiClientPage, 'Turn off encryption?', 'Turn off encryption', MASTER_PASSWORD);

        await expect(getVaultButton(apiClientPage, 'Encrypt secrets')).toBeVisible();

        await expect.poll(() => readStoredValues(apiClientPage)).toEqual(['abc']);
    });

    apiClientTest('resets a forgotten password and empties the encrypted values', async ({ apiClientPage }) => {
        await callBackground(apiClientPage, 'environments/save', STAGING);

        await createVault(apiClientPage);

        await lockVault(apiClientPage);

        await getVaultButton(apiClientPage, 'Unlock secrets').click();

        await apiClientPage
            .getByRole('dialog', { name: 'Unlock secrets' })
            .getByRole('button', { name: 'Forgot the password?', exact: true })
            .click();

        await apiClientPage
            .getByRole('dialog', { name: 'Reset the vault?' })
            .getByRole('button', { name: 'Delete encrypted values', exact: true })
            .click();

        await expect(getVaultButton(apiClientPage, 'Encrypt secrets')).toBeVisible();

        await expect.poll(() => readStoredValues(apiClientPage)).toEqual(['']);
    });
});

/** Imports the command through the dialog in the header */
const importCurl = async (page: Page, command: string) => {
    await page.getByRole('button', { name: 'Import cURL', exact: true }).click();

    const dialog = page.getByRole('dialog', { name: 'Import a cURL command' });

    await dialog.getByRole('textbox', { name: 'cURL command', exact: true }).fill(command);

    await dialog.getByRole('button', { name: 'Import', exact: true }).click();

    return dialog;
};

apiClientTest.describe('cURL import', () => {
    apiClientTest('opens a command in a new tab, ready to send', async ({ apiClientPage, testServer }) => {
        const url = `${testServer.origin}${PATHS.CURL}`;

        /** The shape of "Copy as cURL (bash)" in the browser's developer tools */
        const command = [
            `curl '${url}?page=2' \\`,
            "  -H 'accept: application/json' \\",
            "  -H 'content-type: application/json' \\",
            `  --data-raw '{"name":"Ada"}'`,
        ].join('\n');

        const dialog = await importCurl(apiClientPage, command);

        await expect(dialog).toBeHidden();

        await expect(getTabBar(apiClientPage).getByRole('listitem')).toHaveCount(2);

        await expect(getUrlField(apiClientPage)).toHaveValue(url);

        await apiClientPage.getByRole('button', { name: 'Send', exact: true }).click();

        await getReceived(testServer, `${PATHS.CURL}?page=2`).toMatchObject({
            method: HttpMethods.POST,
            headers: { accept: 'application/json', 'content-type': 'application/json' },
            body: '{"name":"Ada"}',
        });
    });

    apiClientTest('names what it cannot import and keeps the dialog open', async ({ apiClientPage }) => {
        const dialog = await importCurl(apiClientPage, 'curl -F file=@photo.png https://api.example.com/upload');

        await expect(dialog.getByRole('alert')).toContainText('-F is not supported');

        await expect(dialog).toBeVisible();
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
