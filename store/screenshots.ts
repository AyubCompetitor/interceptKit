import type { Page } from '@playwright/test';

import { Features } from '#entities/config';
import type { Environment } from '#entities/environment';
import { MockBodyTypes, type Mock } from '#entities/mock';
import { HeaderOperations, RuleTargetTypes, RuleTypes, type Rule } from '#entities/rule';
import { BundleParts, buildBundleText } from '#features/transfer';
import { Locales, type Locale } from '#shared/config';
import { CATALOGS } from '#shared/i18n';
import { Sources, SyntaxTypes } from '#shared/lib';

import {
    addPolicyStub,
    callBackground,
    copyExtensionWithHostAccess,
    expect,
    networkTest,
    setPolicy,
} from '../e2e/fixtures.ts';
import { LOOPBACK_HOST } from '../e2e/testServer.ts';

/** The store takes screenshots of 1280 × 800 */
const VIEWPORT = {
    width: 1280,
    height: 800,
};

const SCREENSHOTS_DIR = 'store/screenshots';

const EXAMPLE_PATTERN = '*://*.example.com/*';

const TEST_SITE_PATTERN = `http://${LOOPBACK_HOST}/*`;

const STORE_EXTENSION_FOLDER = 'chrome-mv3-store';

const USERS_URL = '{{baseUrl}}/api/users?page=2';

const PAGES = {
    OPTIONS: 'pages/options.html',
    API_CLIENT: 'pages/api-client.html',
} as const;

const BLOCK_RULE: Rule = {
    id: 'block-analytics',
    name: 'Block analytics',
    enabled: true,
    source: Sources.USER,
    type: RuleTypes.BLOCK,
    match: { url: { syntaxType: SyntaxTypes.FILTER, value: '||analytics.example.com^' } },
};

const RULES: readonly Rule[] = [
    {
        id: 'staging-api',
        name: 'Point the API to staging',
        enabled: true,
        source: Sources.USER,
        type: RuleTypes.REDIRECT,
        match: { url: { syntaxType: SyntaxTypes.FILTER, value: '||api.example.com/v1/' } },
        to: { targetType: RuleTargetTypes.TRANSFORM, host: 'staging.example.com' },
    },
    {
        id: 'debug-header',
        name: 'Add a debug header',
        enabled: true,
        source: Sources.USER,
        type: RuleTypes.HEADERS,
        match: { url: { syntaxType: SyntaxTypes.FILTER, value: '||app.example.com^' } },
        request: [{ name: 'X-Debug', operation: HeaderOperations.SET, value: '1' }],
        response: [],
    },
    BLOCK_RULE,
];

const MOCKS: readonly Mock[] = [
    {
        id: 'users',
        name: 'Users of the first page',
        enabled: true,
        source: Sources.USER,
        match: { url: { syntaxType: SyntaxTypes.FILTER, value: '||api.example.com/v1/users' } },
        response: {
            status: 200,
            headers: [{ key: 'Content-Type', value: 'application/json', enabled: true }],
            bodyType: MockBodyTypes.JSON,
            body: '{"users":[{"id":1,"name":"Ada"}]}',
            delayMs: 300,
        },
    },
    {
        id: 'orders-error',
        name: 'Orders fail',
        enabled: true,
        source: Sources.USER,
        match: { url: { syntaxType: SyntaxTypes.FILTER, value: '||api.example.com/v1/orders' } },
        response: { status: 503, headers: [], bodyType: MockBodyTypes.TEXT, body: 'Service unavailable', delayMs: 0 },
    },
];

const POLICY = {
    allowedHosts: ['*.example.com', 'localhost'],
    requireVault: true,
    disabledFeatures: [Features.BLOCK],
    presetBundle: buildBundleText(
        { rules: [BLOCK_RULE], mocks: [], environments: [], collections: [] },
        [BundleParts.RULES],
        '2026-10-24T12:00:00.000Z',
    ),
};

/** Access to example.com from install makes the rules and mocks look as they do once a user allows the site */
const storeTest = networkTest.extend({
    extensionPath: [
        async ({}, use, workerInfo) => {
            const extensionPath = copyExtensionWithHostAccess(workerInfo.project.outputDir, STORE_EXTENSION_FOLDER, [
                EXAMPLE_PATTERN,
                TEST_SITE_PATTERN,
            ]);

            addPolicyStub(extensionPath);

            await use(extensionPath);
        },
        { scope: 'worker' },
    ],
});

const saveRecords = async (page: Page) => {
    for (const rule of RULES) {
        expect(await callBackground(page, 'rules/save', rule)).toMatchObject({ ok: true });
    }

    for (const mock of MOCKS) {
        expect(await callBackground(page, 'mocks/save', mock)).toMatchObject({ ok: true });
    }

    const site = { pattern: EXAMPLE_PATTERN, mocks: true };

    expect(await callBackground(page, 'sites/setMocks', site)).toMatchObject({ ok: true });
};

const capture = async (page: Page, locale: Locale, name: string) => {
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/${locale}/${name}.png`, animations: 'disabled' });
};

const openSection = async (page: Page, extensionId: string, section: string) => {
    await page.goto(`chrome-extension://${extensionId}/${PAGES.OPTIONS}#${section}`);

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
};

for (const locale of [Locales.en, Locales.ru]) {
    storeTest(`screenshots in ${locale}`, async ({ context, extensionId, testServer }) => {
        const page = await context.newPage();

        await page.setViewportSize(VIEWPORT);
        await openSection(page, extensionId, 'rules');

        expect(await callBackground(page, 'settings/update', { locale })).toMatchObject({ ok: true });

        await saveRecords(page);

        await openSection(page, extensionId, 'rules');
        await capture(page, locale, '1-rules');

        await openSection(page, extensionId, 'mocks');
        await capture(page, locale, '2-mocks');

        const staging: Environment = {
            id: 'staging',
            name: 'Staging',
            variables: [
                { key: 'baseUrl', value: testServer.origin, enabled: true, secret: false },
                { key: 'token', value: 'abc', enabled: true, secret: true },
            ],
        };

        expect(await callBackground(page, 'environments/save', staging)).toMatchObject({ ok: true });

        expect(await callBackground(page, 'environments/choose', { activeId: staging.id })).toMatchObject({ ok: true });

        await page.goto(`chrome-extension://${extensionId}/${PAGES.API_CLIENT}`);
        await page.getByRole('textbox', { name: CATALOGS[locale].apiClientUrl.message, exact: true }).fill(USERS_URL);
        await page.keyboard.press('Enter');

        const responseBody = page.getByRole('textbox', { name: CATALOGS[locale].apiClientResponseBodyEditor.message });

        await expect(responseBody).toContainText('"method": "GET"');

        await capture(page, locale, '3-api-client');

        await openSection(page, extensionId, 'sites');
        await capture(page, locale, '4-sites');

        await setPolicy(page, POLICY);
        await openSection(page, extensionId, 'policy');

        await expect(page.locator('dl')).toBeVisible();

        await capture(page, locale, '5-policy');
    });
}
