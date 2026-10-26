import type { Page } from '@playwright/test';

import { VAULT_LOCK_ALARM, type Environment } from '#entities/environment';
import {
    apiClientDatabase,
    CollectionItemTypes,
    createRequestItem,
    historyStore,
    openRequestsStore,
    OPEN_REQUESTS_KEY,
    RequestBodyTypes,
    type Collection,
} from '#entities/request';
import { BundleParts, buildBundleText } from '#features/transfer';
import { API_CLIENT_CONFIG } from '#shared/config';
import { HttpMethods } from '#shared/lib';
import { RpcErrorCodes } from '#shared/messaging';

import {
    callBackground,
    expect,
    getSessionRules,
    networkTest,
    REQUESTED_ORIGINS,
    stubAccessRequest,
    trackErrors,
} from './fixtures.ts';
import { BYTES_PATH, FOREIGN_HOST, LOOPBACK_HOST, type TestServer } from './testServer.ts';

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
    VAULT_CHANGED: '/api-client/vault-changed',
    CURL: '/api-client/curl',
    CURL_EXPORT: '/api-client/curl-export',
    COLLECTION: '/api-client/collection',
    POSTMAN: '/api-client/postman',
    OPENAPI: '/api-client/openapi',
    RULE_HEADERS: '/api-client/rule-headers',
    QUERY: '/api-client/query',
    LEGACY: '/api-client/legacy',
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

const NEW_MASTER_PASSWORD = 'another horse battery';

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
        await getUrlField(apiClientPage).fill(testServer.origin + PATHS.PARAMS);

        await addRow(apiClientPage, 'Add parameter', 'Parameter', 'page', '2');

        await openSection(apiClientPage, 'Headers');

        await addRow(apiClientPage, 'Add header', 'Header', 'X-Trace', 'e2e');

        await expect(getUrlField(apiClientPage)).toHaveValue(`${testServer.origin}${PATHS.PARAMS}?page=2`);

        await apiClientPage.getByRole('button', { name: 'Send', exact: true }).click();

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

    apiClientTest(
        'downloads only the beginning of a response past the limit',
        async ({ apiClientPage, testServer }) => {
            const size = API_CLIENT_CONFIG.MAX_RESPONSE_BYTES + 1024 * 1024;

            await sendRequest(apiClientPage, `${testServer.origin}${BYTES_PATH}${size}`);

            const panel = getResponsePanel(apiClientPage);

            await expect(panel.getByText('The response is larger than 10 MB')).toBeVisible();

            await expect(panel.getByText('10 MB', { exact: true })).toBeVisible();
        },
    );

    apiClientTest('names the headers a rule sets and those the browser builds', async ({ apiClientPage }) => {
        await openSection(apiClientPage, 'Headers');

        await addRow(apiClientPage, 'Add header', 'Header', 'Cookie', 'a=1');

        await addRow(apiClientPage, 'Add header', 'Header', 'Host', 'other.example');

        await expect(apiClientPage.getByText('sets them on this request only: Cookie.')).toBeVisible();

        await expect(apiClientPage.getByText("the values typed here aren't sent: Host.")).toBeVisible();
    });

    apiClientTest(
        'sends the headers fetch() drops through a rule that ends with the request',
        async ({ apiClientPage, context, serviceWorker, testServer }) => {
            await context.addCookies([{ ...SESSION_COOKIE, url: testServer.origin }]);

            await openSection(apiClientPage, 'Headers');

            await addRow(apiClientPage, 'Add header', 'Header', 'Cookie', 'typed=1');

            await addRow(apiClientPage, 'Add header', 'Header', 'User-Agent', 'XRequest-Test');

            await addRow(apiClientPage, 'Add header', 'Header', 'Origin', 'https://origin.example');

            await sendRequest(apiClientPage, testServer.origin + PATHS.RULE_HEADERS);

            await getReceived(testServer, PATHS.RULE_HEADERS).toMatchObject({
                headers: {
                    cookie: 'typed=1',
                    'user-agent': 'XRequest-Test',
                    origin: 'https://origin.example',
                },
            });

            await expect.poll(() => getSessionRules(serviceWorker)).toEqual([]);
        },
    );
});

/** A request as the client saved it before the URL held its query: the table added the parameters at sending */
const makeLegacyRequest = (url: string) => ({
    id: 'legacy',
    method: HttpMethods.GET,
    url,
    query: [
        { key: 'page', value: '2', enabled: true },
        { key: 'off', value: '1', enabled: false },
    ],
    headers: [],
    body: { bodyType: RequestBodyTypes.NONE },
    sendCookies: false,
});

/** Creates the database at version 1 with an open tab and a history entry, before the API client ever opens it */
const seedLegacyDatabase = async (page: Page, legacyRequest: object) => {
    await page.evaluate(
        async ({ database, request }) => {
            const connection = await new Promise<IDBDatabase>((resolve, reject) => {
                const opening = indexedDB.open(database.NAME, 1);

                opening.addEventListener('upgradeneeded', () => {
                    opening.result
                        .createObjectStore(database.HISTORY, { keyPath: 'id' })
                        .createIndex('sentAt', 'sentAt');
                    opening.result.createObjectStore(database.OPEN_REQUESTS, { keyPath: 'id' });
                });
                opening.addEventListener('success', () => resolve(opening.result));
                opening.addEventListener('error', () => reject(opening.error));
            });

            const transaction = connection.transaction([database.HISTORY, database.OPEN_REQUESTS], 'readwrite');

            transaction
                .objectStore(database.OPEN_REQUESTS)
                .put({ id: database.OPEN_REQUESTS_KEY, requests: [request], activeId: 'legacy' });
            transaction.objectStore(database.HISTORY).put({ id: 'legacy-entry', sentAt: 1, request });

            await new Promise((resolve, reject) => {
                transaction.addEventListener('complete', resolve);
                transaction.addEventListener('error', () => reject(transaction.error));
            });

            connection.close();
        },
        { database: DATABASE, request: legacyRequest },
    );
};

apiClientTest.describe('query of the URL', () => {
    apiClientTest('mirrors the query in the table and back', async ({ apiClientPage, testServer }) => {
        const url = `${testServer.origin}${PATHS.QUERY}`;

        await getUrlField(apiClientPage).fill(`${url}?a=1&flag`);

        const keys = apiClientPage.getByRole('textbox', { name: 'Parameter', exact: true });

        await expect(keys).toHaveCount(2);

        await expect(keys.first()).toHaveValue('a');

        await expect(keys.last()).toHaveValue('flag');

        await apiClientPage.getByRole('switch', { name: 'Send the parameter' }).first().click();

        await expect(getUrlField(apiClientPage)).toHaveValue(`${url}?flag`);

        await apiClientPage.getByRole('button', { name: 'Send', exact: true }).click();

        await getReceived(testServer, `${PATHS.QUERY}?flag`).toMatchObject({ method: HttpMethods.GET });
    });

    networkTest(
        'moves the parameters of tabs and history saved before into their URL once',
        async ({ context, extensionId, testServer }) => {
            const url = `${testServer.origin}${PATHS.LEGACY}`;
            const seedPage = await context.newPage();

            await seedPage.goto(`chrome-extension://${extensionId}/pages/popup.html`);

            await seedLegacyDatabase(seedPage, makeLegacyRequest(url));

            await seedPage.close();

            const page = await context.newPage();
            const errors = trackErrors(page);

            await page.goto(`chrome-extension://${extensionId}/${API_CLIENT_PATH}`);

            await expect(getUrlField(page)).toHaveValue(`${url}?page=2`);

            await expect(page.getByRole('switch', { name: 'Send the parameter' })).toHaveCount(2);

            await expect(getHistoryPanel(page)).toContainText('?page=2');

            await page.getByRole('button', { name: 'Send', exact: true }).click();

            await getReceived(testServer, `${PATHS.LEGACY}?page=2`).toMatchObject({ method: HttpMethods.GET });

            expect(errors).toEqual([]);
        },
    );
});

apiClientTest.describe('host access', () => {
    apiClientTest('asks for the host a request goes to', async ({ apiClientPage, testServer }) => {
        await apiClientPage.evaluate(stubAccessRequest);

        await sendRequest(apiClientPage, testServer.foreignOrigin + PATHS.PARAMS);

        await expect(getResponsePanel(apiClientPage)).toContainText(`XRequest has no access to ${FOREIGN_HOST}`);

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

        await getVaultButton(apiClientPage, 'Vault settings').click();

        await apiClientPage
            .getByRole('dialog', { name: 'Change the master password' })
            .getByRole('button', { name: 'Turn off encryption', exact: true })
            .click();

        await submitPassword(apiClientPage, 'Turn off encryption?', 'Turn off encryption', MASTER_PASSWORD);

        await expect(getVaultButton(apiClientPage, 'Encrypt secrets')).toBeVisible();

        await expect.poll(() => readStoredValues(apiClientPage)).toEqual(['abc']);
    });

    apiClientTest('changes the master password and keeps the secrets', async ({ apiClientPage, testServer }) => {
        await prepareSecretRequest(apiClientPage);

        await createVault(apiClientPage);

        await getVaultButton(apiClientPage, 'Vault settings').click();

        const settings = apiClientPage.getByRole('dialog', { name: 'Change the master password' });

        await settings.getByLabel('Current password', { exact: true }).fill(MASTER_PASSWORD);

        await settings.getByLabel('New password', { exact: true }).fill(NEW_MASTER_PASSWORD);

        await settings.getByLabel('Repeat the password', { exact: true }).fill(NEW_MASTER_PASSWORD);

        await settings.getByRole('button', { name: 'Change password', exact: true }).click();

        await expect(settings).toBeHidden();

        await lockVault(apiClientPage);

        const oldAnswer = await callBackground(apiClientPage, 'vault/unlock', { password: MASTER_PASSWORD });

        expect(oldAnswer).toEqual({ ok: true, result: false });

        await callBackground(apiClientPage, 'vault/unlock', { password: NEW_MASTER_PASSWORD });

        await expect(getVaultButton(apiClientPage, 'Lock secrets')).toBeVisible();

        await sendRequest(apiClientPage, `${testServer.origin}${PATHS.VAULT_CHANGED}`);

        await getReceived(testServer, PATHS.VAULT_CHANGED).toMatchObject({ headers: { authorization: 'Bearer abc' } });
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

        await expect(getUrlField(apiClientPage)).toHaveValue(`${url}?page=2`);

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

const stubClipboard = () => {
    Object.defineProperty(navigator.clipboard, 'writeText', {
        value: async (text: string) => {
            document.body.dataset.clipboard = text;
        },
    });
};

const getCopiedText = (page: Page) => page.evaluate(() => document.body.dataset.clipboard ?? '');

const getExportDialog = (page: Page) => page.getByRole('dialog', { name: 'Copy as cURL' });

const getCommandField = (page: Page) =>
    getExportDialog(page).getByRole('textbox', { name: 'Command for bash', exact: true });

apiClientTest.describe('cURL export', () => {
    apiClientTest('writes the request as a command the import reads back', async ({ apiClientPage, testServer }) => {
        const url = testServer.origin + PATHS.CURL_EXPORT;
        const environment: Environment = {
            id: 'local',
            name: 'Local',
            variables: [
                { key: 'baseUrl', value: testServer.origin, enabled: true, secret: false },
                { key: 'token', value: 'abc', enabled: true, secret: true },
            ],
        };

        await callBackground(apiClientPage, 'environments/save', environment);
        await callBackground(apiClientPage, 'environments/choose', { activeId: environment.id });
        await getUrlField(apiClientPage).fill(`{{baseUrl}}${PATHS.CURL_EXPORT}`);
        await openSection(apiClientPage, 'Headers');
        await addRow(apiClientPage, 'Add header', 'Header', 'Authorization', 'Bearer {{token}}');
        await apiClientPage.getByRole('main').getByRole('button', { name: 'Copy as cURL', exact: true }).click();

        const dialog = getExportDialog(apiClientPage);

        await expect(getCommandField(apiClientPage)).toHaveValue(
            `curl '${url}' \\\n  -H 'Authorization: Bearer {{token}}'`,
        );

        await expect(dialog.getByText('These variables have no value and stay as typed: token.')).toBeVisible();

        await dialog.getByRole('checkbox', { name: 'Fill in secrets', exact: true }).click();

        await expect(getCommandField(apiClientPage)).toHaveValue(`curl '${url}' \\\n  -H 'Authorization: Bearer abc'`);

        await apiClientPage.evaluate(stubClipboard);
        await dialog.getByRole('button', { name: 'Copy', exact: true }).click();

        await expect(dialog.getByRole('status')).toHaveText('Copied to the clipboard.');

        const copied = await getCopiedText(apiClientPage);

        expect(copied).toBe(`curl '${url}' \\\n  -H 'Authorization: Bearer abc'`);

        await apiClientPage.keyboard.press('Escape');

        await expect(dialog).toBeHidden();

        await importCurl(apiClientPage, copied);
        await apiClientPage.getByRole('button', { name: 'Send', exact: true }).click();

        await getReceived(testServer, PATHS.CURL_EXPORT).toMatchObject({
            method: HttpMethods.GET,
            headers: { authorization: 'Bearer abc' },
        });
    });

    apiClientTest('copies a request of the history as it was typed', async ({ apiClientPage, testServer }) => {
        const url = `${testServer.origin}${PATHS.CURL_EXPORT}?from=history`;

        await sendRequest(apiClientPage, url);
        await getHistoryPanel(apiClientPage).getByRole('button', { name: 'Copy as cURL', exact: true }).click();

        await expect(getCommandField(apiClientPage)).toHaveValue(`curl '${url}'`);
    });
});

const makeShopCollection = (url: string): Collection => ({
    id: 'shop',
    name: 'Shop API',
    createdAt: 1,
    items: [
        {
            itemType: CollectionItemTypes.FOLDER,
            id: 'users',
            name: 'Users',
            items: [
                createRequestItem({
                    id: 'list-users',
                    name: 'List users',
                    method: HttpMethods.GET,
                    url,
                    query: [{ key: 'from', value: 'collection', enabled: true }],
                    headers: [],
                    body: { bodyType: RequestBodyTypes.NONE },
                    sendCookies: false,
                }),
            ],
        },
    ],
});

const getCollectionPanel = (page: Page) => page.getByRole('region', { name: 'Collections' });

const getUnsavedMark = (page: Page) => getTabBar(page).getByRole('img', { name: 'Unsaved changes' });

const getSaveDialog = (page: Page) => page.getByRole('dialog', { name: 'Save to a collection' });

const chooseRowAction = async (page: Page, rowName: string, action: string) => {
    const label = `Actions for ${rowName}`;
    const panel = getCollectionPanel(page);

    await panel.getByRole('button', { name: label, exact: true }).click();

    await panel.getByRole('group', { name: label }).getByRole('button', { name: action, exact: true }).click();
};

const submitName = async (page: Page, dialogName: string, name: string, submitLabel: string) => {
    const dialog = page.getByRole('dialog', { name: dialogName });

    await dialog.getByRole('textbox', { name: 'Name', exact: true }).fill(name);

    await dialog.getByRole('button', { name: submitLabel, exact: true }).click();

    await expect(dialog).toBeHidden();
};

apiClientTest.describe('collections', () => {
    apiClientTest('save a tab into a new collection and keep it linked', async ({ apiClientPage, testServer }) => {
        const url = testServer.origin + PATHS.COLLECTION;
        const changedUrl = `${url}?page=2`;
        const dialog = getSaveDialog(apiClientPage);

        await getUrlField(apiClientPage).fill(url);

        await apiClientPage.getByRole('button', { name: 'Save to a collection', exact: true }).click();

        await dialog.getByRole('textbox', { name: 'Name of the request', exact: true }).fill('List users');

        await dialog.getByRole('textbox', { name: 'Name of the new collection', exact: true }).fill('Shop API');

        await dialog.getByRole('button', { name: 'Save', exact: true }).click();

        await expect(dialog).toBeHidden();

        await openSection(apiClientPage, 'Collections');

        await expect(
            getCollectionPanel(apiClientPage).getByRole('button', { name: 'GET List users', exact: true }),
        ).toBeVisible();

        await expect(getUnsavedMark(apiClientPage)).toBeHidden();

        await expect(
            getTabBar(apiClientPage).getByRole('button', { name: 'Close List users', exact: true }),
        ).toBeVisible();

        await getUrlField(apiClientPage).fill(changedUrl);

        await expect(getUnsavedMark(apiClientPage)).toBeVisible();

        await apiClientPage.keyboard.press('Control+s');

        await expect(getUnsavedMark(apiClientPage)).toBeHidden();

        await expect.poll(() => readSavedUrls(apiClientPage)).toEqual([changedUrl]);

        await apiClientPage.reload();

        await getUrlField(apiClientPage).fill(url);

        await expect(getUnsavedMark(apiClientPage)).toBeVisible();

        await getUrlField(apiClientPage).fill(changedUrl);

        await expect(getUnsavedMark(apiClientPage)).toBeHidden();
    });

    apiClientTest('open a request in one tab, ready to send', async ({ apiClientPage, testServer }) => {
        const path = `${PATHS.COLLECTION}?from=collection`;
        const url = testServer.origin + path;
        const text = buildBundleText(
            { rules: [], mocks: [], environments: [], collections: [makeShopCollection(url)] },
            [BundleParts.COLLECTIONS],
            new Date().toISOString(),
        );
        const panel = getCollectionPanel(apiClientPage);
        const folder = panel.getByRole('button', { name: 'Users', exact: true });
        const request = panel.getByRole('button', { name: 'GET List users', exact: true });
        const tabs = getTabBar(apiClientPage).getByRole('listitem');

        await callBackground(apiClientPage, 'transfer/import', { text });

        await openSection(apiClientPage, 'Collections');

        await folder.click();

        await expect(request).toBeHidden();

        await folder.click();

        await request.click();

        await expect(getUrlField(apiClientPage)).toHaveValue(url);

        await tabs.first().getByRole('button').first().click();

        await expect(getUrlField(apiClientPage)).toHaveValue('');

        await request.click();

        await expect(tabs).toHaveCount(2);

        await expect(getUrlField(apiClientPage)).toHaveValue(url);

        await apiClientPage.getByRole('button', { name: 'Send', exact: true }).click();

        await getReceived(testServer, path).toMatchObject({ method: HttpMethods.GET });
    });

    apiClientTest('add, rename and delete through the menu of a row', async ({ apiClientPage }) => {
        const panel = getCollectionPanel(apiClientPage);

        await openSection(apiClientPage, 'Collections');

        await panel.getByRole('button', { name: 'New collection', exact: true }).click();

        await submitName(apiClientPage, 'New collection', 'Shop API', 'Create');

        await chooseRowAction(apiClientPage, 'Shop API', 'New folder');

        await submitName(apiClientPage, 'New folder', 'Users', 'Create');

        await chooseRowAction(apiClientPage, 'Users', 'New request');

        await submitName(apiClientPage, 'New request', 'List users', 'Create');

        await expect(panel.getByRole('button', { name: 'GET List users', exact: true })).toBeVisible();

        await expect(getTabBar(apiClientPage).getByRole('listitem')).toHaveCount(2);

        await chooseRowAction(apiClientPage, 'List users', 'Rename');

        await expect(
            apiClientPage.getByRole('dialog', { name: 'Rename' }).getByRole('textbox', { name: 'Name', exact: true }),
        ).toHaveValue('List users');

        await submitName(apiClientPage, 'Rename', 'All users', 'Save');

        await expect(panel.getByRole('button', { name: 'GET All users', exact: true })).toBeVisible();

        await expect(
            getTabBar(apiClientPage).getByRole('button', { name: 'Close All users', exact: true }),
        ).toBeVisible();

        await chooseRowAction(apiClientPage, 'Users', 'Delete');

        await apiClientPage
            .getByRole('dialog', { name: 'Delete from the collections?' })
            .getByRole('button', { name: 'Delete', exact: true })
            .click();

        await expect(panel.getByRole('button', { name: 'Users', exact: true })).toBeHidden();

        await expect(panel.getByRole('button', { name: 'Shop API', exact: true })).toBeVisible();

        await expect(getTabBar(apiClientPage).getByRole('listitem')).toHaveCount(2);

        await apiClientPage.keyboard.press('Control+s');

        await expect(getSaveDialog(apiClientPage)).toBeVisible();
    });
});

const POSTMAN_SCHEMA = 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json';

const makePostmanCollection = (baseUrl: string) => ({
    info: { name: 'Shop API', schema: POSTMAN_SCHEMA },
    auth: { type: 'bearer', bearer: [{ key: 'token', value: '{{token}}', type: 'string' }] },
    variable: [
        { key: 'baseUrl', value: baseUrl },
        { key: 'token', value: 'abc', type: 'secret' },
    ],
    item: [
        {
            name: 'Users',
            item: [
                {
                    name: 'List users',
                    event: [{ listen: 'test', script: { exec: ['pm.test("ok", () => {});'] } }],
                    request: {
                        method: HttpMethods.GET,
                        header: [{ key: 'X-Source', value: 'postman' }],
                        url: `{{baseUrl}}${PATHS.POSTMAN}?page=2`,
                    },
                },
            ],
        },
        {
            name: 'Upload avatar',
            request: {
                method: HttpMethods.POST,
                url: '{{baseUrl}}/avatar',
                body: { mode: 'formdata', formdata: [{ key: 'file', type: 'file', src: '/tmp/a.png' }] },
            },
        },
    ],
});

const POSTMAN_ENVIRONMENT = {
    name: 'Staging',
    values: [
        { key: 'baseUrl', value: 'https://staging.example.com', type: 'default', enabled: true },
        { key: 'token', value: 'abc', type: 'secret', enabled: true },
    ],
    _postman_variable_scope: 'environment',
};

const getImportDialog = (page: Page) => page.getByRole('dialog', { name: 'Import a collection' });

const getImportPreview = (page: Page) => getImportDialog(page).getByRole('region', { name: 'What the import will do' });

const openFileImport = async (page: Page) => {
    await openSection(page, 'Collections');

    await getCollectionPanel(page).getByRole('button', { name: 'Import', exact: true }).click();
};

const pasteImportFile = async (page: Page, file: object) => {
    await getImportDialog(page)
        .getByRole('textbox', { name: 'Or paste the text of a file', exact: true })
        .fill(JSON.stringify(file));
};

const confirmImport = async (page: Page) => {
    await getImportDialog(page).getByRole('button', { name: 'Import', exact: true }).click();

    await expect(getImportDialog(page)).toBeHidden();
};

apiClientTest.describe('Postman import', () => {
    apiClientTest('brings a collection and its variables, ready to send', async ({ apiClientPage, testServer }) => {
        const preview = getImportPreview(apiClientPage);
        const panel = getCollectionPanel(apiClientPage);

        await openFileImport(apiClientPage);

        await pasteImportFile(apiClientPage, makePostmanCollection(testServer.origin));

        await expect(preview).toContainText('A new collection “Shop API”: requests: 2, folders: 1.');

        await expect(preview).toContainText('A new environment “Shop API: variables”: variables: 2.');

        await expect(preview).toContainText('Secret values will be stored unencrypted');

        await expect(preview).toContainText('Scripts and tests (scripts: 1)');

        await expect(preview).toContainText('Bodies of the kinds formdata (requests: 1)');

        await confirmImport(apiClientPage);

        await expect(panel.getByRole('button', { name: 'Users', exact: true })).toBeVisible();

        await getEnvironmentSelect(apiClientPage).selectOption({ label: 'Shop API: variables' });

        await panel.getByRole('button', { name: 'GET List users', exact: true }).click();

        await apiClientPage.getByRole('button', { name: 'Send', exact: true }).click();

        await getReceived(testServer, `${PATHS.POSTMAN}?page=2`).toMatchObject({
            method: HttpMethods.GET,
            headers: { authorization: 'Bearer abc', 'x-source': 'postman' },
        });
    });

    apiClientTest(
        'reads an environment from a file and leaves secrets empty while locked',
        async ({ apiClientPage }) => {
            await createVault(apiClientPage);

            await lockVault(apiClientPage);

            await openFileImport(apiClientPage);

            await getImportDialog(apiClientPage)
                .getByLabel('File', { exact: true })
                .setInputFiles({
                    name: 'staging.postman_environment.json',
                    mimeType: 'application/json',
                    buffer: Buffer.from(JSON.stringify(POSTMAN_ENVIRONMENT)),
                });

            await expect(getImportPreview(apiClientPage)).toContainText(
                'The vault is locked, so secret values will be left empty.',
            );

            await confirmImport(apiClientPage);

            await expect.poll(() => readStoredValues(apiClientPage)).toEqual(['https://staging.example.com', '']);

            await expect(getEnvironmentSelect(apiClientPage).getByRole('option', { name: 'Staging' })).toBeAttached();
        },
    );

    apiClientTest('names what is wrong with a file and imports nothing', async ({ apiClientPage }) => {
        const dialog = getImportDialog(apiClientPage);

        await openFileImport(apiClientPage);

        await pasteImportFile(apiClientPage, { name: 'Old', requests: [] });

        await expect(dialog.getByRole('alert')).toContainText('collections of Postman v1 cannot be imported');

        await expect(dialog.getByRole('button', { name: 'Import', exact: true })).toBeDisabled();
    });
});

/** A description the way an API publishes it: a server, a tag, a path parameter and a bearer token */
const makeOpenApiDescription = (serverUrl: string) => ({
    openapi: '3.1.0',
    info: { title: 'Pet Store', version: '1.0.0' },
    servers: [{ url: serverUrl }],
    tags: [{ name: 'pets' }],
    paths: {
        '/pets/{petId}': {
            get: {
                tags: ['pets'],
                summary: 'Get a pet',
                parameters: [
                    { name: 'petId', in: 'path', required: true, schema: { type: 'integer' } },
                    { name: 'fields', in: 'query', required: true, example: 'name' },
                ],
            },
        },
        '/pets': {
            post: {
                tags: ['pets'],
                summary: 'Add a pet',
                requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Pet' } } } },
            },
        },
    },
    components: {
        schemas: { Pet: { type: 'object', properties: { name: { type: 'string', example: 'Rex' } } } },
        securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer' } },
    },
    security: [{ bearerAuth: [] }],
});

/** The secret the import leaves empty and the path parameter go into the imported environment */
const fillImportedEnvironment = async (page: Page) => {
    const { environments } = await page.evaluate(() =>
        chrome.storage.local.get<{ environments: Environment[] }>('environments'),
    );
    const [imported] = environments;

    if (!imported) {
        throw new Error('expected the imported environment');
    }

    const variables = [
        ...imported.variables.map(variable => (variable.key === 'token' ? { ...variable, value: 'abc' } : variable)),
        { key: 'petId', value: '7', enabled: true, secret: false },
    ];

    await callBackground(page, 'environments/save', { ...imported, variables });

    await callBackground(page, 'environments/choose', { activeId: imported.id });
};

apiClientTest.describe('OpenAPI import', () => {
    apiClientTest('turns operations into requests that reach the API', async ({ apiClientPage, testServer }) => {
        const preview = getImportPreview(apiClientPage);
        const panel = getCollectionPanel(apiClientPage);

        await openFileImport(apiClientPage);

        await pasteImportFile(apiClientPage, makeOpenApiDescription(testServer.origin + PATHS.OPENAPI));

        await expect(preview).toContainText('A new collection “Pet Store”: requests: 2, folders: 1.');

        await expect(preview).toContainText('A new environment “Pet Store: variables”: variables: 2.');

        await expect(preview).toContainText('Fill in these secrets in the environment before sending: token.');

        await confirmImport(apiClientPage);

        await fillImportedEnvironment(apiClientPage);

        await panel.getByRole('button', { name: 'GET Get a pet', exact: true }).click();

        await expect(getUrlField(apiClientPage)).toHaveValue('{{baseUrl}}/pets/{{petId}}?fields=name');

        await apiClientPage.getByRole('button', { name: 'Send', exact: true }).click();

        await getReceived(testServer, `${PATHS.OPENAPI}/pets/7?fields=name`).toMatchObject({
            method: HttpMethods.GET,
            headers: { authorization: 'Bearer abc' },
        });
    });

    apiClientTest('asks for JSON when the description is YAML', async ({ apiClientPage }) => {
        const dialog = getImportDialog(apiClientPage);

        await openFileImport(apiClientPage);

        await dialog
            .getByRole('textbox', { name: 'Or paste the text of a file', exact: true })
            .fill('openapi: 3.1.0\ninfo:\n  title: Pet Store\n');

        await expect(dialog.getByRole('alert')).toContainText('convert the file to JSON');

        await expect(dialog.getByRole('button', { name: 'Import', exact: true })).toBeDisabled();
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
