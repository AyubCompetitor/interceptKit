import { readFileSync } from 'node:fs';

import type { Page } from '@playwright/test';

import type { Environment } from '#entities/environment';
import { MockBodyTypes, type Mock } from '#entities/mock';
import { createRequestItem, RequestBodyTypes, type Collection } from '#entities/request';
import { RuleTypes, type Rule } from '#entities/rule';
import { BUNDLE_VERSION, BundleParts, buildBundleText } from '#features/transfer';
import { HttpMethods, Sources, SyntaxTypes } from '#shared/lib';

import { callBackground, expect, openSection, test } from './fixtures.ts';

const RULE: Rule = {
    id: 'block-ads',
    name: 'Block ads',
    enabled: true,
    source: Sources.USER,
    type: RuleTypes.BLOCK,
    match: { url: { syntaxType: SyntaxTypes.FILTER, value: '||ads.example.com^' } },
};

const MOCK: Mock = {
    id: 'users',
    name: 'Users',
    enabled: true,
    source: Sources.USER,
    match: { url: { syntaxType: SyntaxTypes.FILTER, value: '||api.example.com/users' } },
    response: { status: 200, headers: [], bodyType: MockBodyTypes.JSON, body: '[]', delayMs: 0 },
};

const STAGING: Environment = {
    id: 'staging',
    name: 'Staging',
    variables: [
        { key: 'baseUrl', value: 'https://staging.example.com', enabled: true, secret: false },
        { key: 'token', value: 'abc', enabled: true, secret: true },
    ],
};

/** A file as another browser exports it: a new rule, and the environment with its secret empty */
const IMPORTED_TEXT = JSON.stringify({
    format: 'xrequest',
    version: 1,
    rules: [{ ...RULE, id: 'block-trackers', name: 'Block trackers', source: undefined }],
    environments: [
        {
            ...STAGING,
            name: 'Staging from git',
            variables: [{ key: 'token', value: '', enabled: true, secret: true }],
        },
    ],
});

const EXPORTED_AT = '2026-10-25T12:00:00.000Z';

const SHOP_COLLECTION: Collection = {
    id: 'shop',
    name: 'Shop API',
    createdAt: 1,
    items: [
        createRequestItem({
            id: 'users',
            name: 'List users',
            method: HttpMethods.GET,
            url: 'https://api.example.com/users',
            query: [],
            headers: [],
            body: { bodyType: RequestBodyTypes.NONE },
            sendCookies: false,
        }),
    ],
};

const readStoredLists = (page: Page) =>
    page.evaluate(() =>
        chrome.storage.local.get<{ rules: Rule[]; environments: Environment[] }>(['rules', 'environments']),
    );

const getImportField = (page: Page) => page.getByRole('textbox', { name: 'Or paste the text of a file', exact: true });

const getPreview = (page: Page) => page.getByRole('region', { name: 'What the import will do' });

test.describe('export', () => {
    test('downloads the chosen lists without secret values', async ({ optionsPage }) => {
        await callBackground(optionsPage, 'rules/save', RULE);

        await callBackground(optionsPage, 'mocks/save', MOCK);

        await callBackground(optionsPage, 'environments/save', STAGING);

        await openSection(optionsPage, 'Import and export');

        await optionsPage.getByRole('checkbox', { name: 'Mocks', exact: true }).click();

        const downloading = optionsPage.waitForEvent('download');

        await optionsPage.getByRole('button', { name: 'Download JSON', exact: true }).click();

        const download = await downloading;

        expect(download.suggestedFilename()).toMatch(/^xrequest-\d{4}-\d{2}-\d{2}\.json$/);

        const file = JSON.parse(readFileSync(await download.path(), 'utf8'));

        expect(file).toMatchObject({
            format: 'xrequest',
            version: BUNDLE_VERSION,
            rules: [{ id: RULE.id, name: RULE.name }],
            collections: [],
        });

        expect(file).not.toHaveProperty('mocks');

        expect(file.rules[0]).not.toHaveProperty('source');

        expect(file.environments[0].variables[1]).toEqual({ enabled: true, key: 'token', secret: true, value: '' });
    });
});

test.describe('import', () => {
    test('shows what it will do, then adds and replaces records', async ({ optionsPage }) => {
        await callBackground(optionsPage, 'rules/save', RULE);

        await callBackground(optionsPage, 'environments/save', STAGING);

        await openSection(optionsPage, 'Import and export');

        await getImportField(optionsPage).fill(IMPORTED_TEXT);

        const preview = getPreview(optionsPage);

        await expect(preview).toContainText('Rules — new: 1, replaced: 0, kept from the policy: 0');

        await expect(preview).toContainText('Environments — new: 0, replaced: 1, kept from the policy: 0');

        await preview.getByRole('button', { name: 'Import', exact: true }).click();

        await expect(optionsPage.getByRole('status')).toContainText('The import is done.');

        await expect
            .poll(async () => (await readStoredLists(optionsPage)).rules.map(rule => rule.id))
            .toEqual([RULE.id, 'block-trackers']);

        const { environments } = await readStoredLists(optionsPage);

        expect(environments[0]).toMatchObject({
            name: 'Staging from git',
            variables: [{ key: 'token', value: 'abc' }],
        });
    });

    test('reads a chosen file', async ({ optionsPage }) => {
        await openSection(optionsPage, 'Import and export');

        await optionsPage.getByLabel('File', { exact: true }).setInputFiles({
            name: 'xrequest.json',
            mimeType: 'application/json',
            buffer: Buffer.from(IMPORTED_TEXT),
        });

        await expect(getPreview(optionsPage)).toContainText('Rules — new: 1');
    });

    test('names what is wrong with a file and imports nothing', async ({ optionsPage }) => {
        await openSection(optionsPage, 'Import and export');

        await getImportField(optionsPage).fill('{"format":"xrequest","version":1,"rules":[{"id":"broken"}]}');

        await expect(optionsPage.getByRole('alert')).toContainText('$.rules[0]');

        await expect(getPreview(optionsPage)).toBeHidden();
    });

    test('refuses in the background a text that is not an export', async ({ optionsPage }) => {
        const answer = await callBackground(optionsPage, 'transfer/import', { text: '{"rules":[]}' });

        expect(answer).toMatchObject({ ok: false, error: { message: expect.stringContaining('not an XRequest') } });
    });

    test('brings collections into the API client and back into an export', async ({
        context,
        extensionId,
        optionsPage,
    }) => {
        const text = buildBundleText(
            { rules: [], mocks: [], environments: [], collections: [SHOP_COLLECTION] },
            [BundleParts.COLLECTIONS],
            EXPORTED_AT,
        );

        expect(await callBackground(optionsPage, 'transfer/import', { text })).toMatchObject({
            ok: true,
            result: { counts: { collections: { added: 1 } } },
        });

        const apiClient = await context.newPage();

        await apiClient.goto(`chrome-extension://${extensionId}/pages/api-client.html`);
        await apiClient.getByRole('radio', { name: 'Collections', exact: true }).click();

        const panel = apiClient.getByRole('region', { name: 'Collections' });

        await expect(panel.getByRole('button', { name: SHOP_COLLECTION.name, exact: true })).toBeVisible();

        await expect(panel.getByRole('button', { name: 'GET List users', exact: true })).toBeVisible();

        await openSection(optionsPage, 'Import and export');

        const downloading = optionsPage.waitForEvent('download');

        await optionsPage.getByRole('button', { name: 'Download JSON', exact: true }).click();

        const file = JSON.parse(readFileSync(await (await downloading).path(), 'utf8'));

        expect(file.collections).toEqual([SHOP_COLLECTION]);
    });
});
