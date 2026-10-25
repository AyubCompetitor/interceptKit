import type { Page, Worker } from '@playwright/test';

import { Features } from '#entities/config';
import type { Environment } from '#entities/environment';
import { MockBodyTypes, type Mock } from '#entities/mock';
import { RuleTargetTypes, RuleTypes, type Rule } from '#entities/rule';
import { BundleParts, buildBundleText } from '#features/transfer';
import { Sources, SyntaxTypes } from '#shared/lib';
import { RpcErrorCodes } from '#shared/messaging';

import {
    callBackground,
    expect,
    getDynamicRules,
    openSection,
    policyTest,
    REQUESTED_ORIGINS,
    setPolicy,
    stubAccessRequest,
    trackErrors,
} from './fixtures.ts';
import { LOOPBACK_HOST } from './testServer.ts';

const POLICY_SECTION = 'Organization policy';

const BLOCKED_BADGE = 'Off by policy';

const BLOCK_RULE: Rule = {
    id: 'block-ads',
    name: 'Block ads',
    enabled: true,
    source: Sources.USER,
    type: RuleTypes.BLOCK,
    match: { url: { syntaxType: SyntaxTypes.FILTER, value: '||ads.example.com^' } },
};

const REDIRECT_RULE: Rule = {
    id: 'move-api',
    name: 'Move the API',
    enabled: true,
    source: Sources.USER,
    type: RuleTypes.REDIRECT,
    match: { url: { syntaxType: SyntaxTypes.FILTER, value: '||api.example.com^' } },
    to: { targetType: RuleTargetTypes.URL, url: 'https://staging.example.com/' },
};

const MOCK: Mock = {
    id: 'users',
    name: 'Users',
    enabled: true,
    source: Sources.USER,
    match: { url: { syntaxType: SyntaxTypes.FILTER, value: '||api.example.com/users' } },
    response: { status: 200, headers: [], bodyType: MockBodyTypes.JSON, body: '[]', delayMs: 0 },
};

const POLICY_WITH_ERROR = {
    disabledFeatures: [Features.MOCKS, Features.REDIRECT],
    allowedHosts: ['*.example.com', 'https://example.org'],
    allowUserRules: false,
};

const getPolicyValue = (page: Page, label: string) =>
    page
        .locator('dl > div')
        .filter({ has: page.getByText(label, { exact: true }) })
        .locator('dd');

const PRESET_TEXT = buildBundleText(
    { rules: [BLOCK_RULE], mocks: [MOCK], environments: [], collections: [] },
    [BundleParts.RULES, BundleParts.MOCKS],
    '2026-10-24T12:00:00.000Z',
);

const PRESET_IDS = {
    RULE: `policy:${BLOCK_RULE.id}`,
    MOCK: `policy:${MOCK.id}`,
} as const;

const SOURCE_BADGE = 'From the organization';

const getRow = (page: Page, name: string) => page.getByRole('listitem').filter({ hasText: name });

const getStoredIds = (page: Page) =>
    page.evaluate(async () => {
        const { rules = [], mocks = [] } = await chrome.storage.local.get<{ rules?: Rule[]; mocks?: Mock[] }>([
            'rules',
            'mocks',
        ]);

        return {
            rules: rules.map(rule => rule.id),
            mocks: mocks.map(mock => mock.id),
        };
    });

const saveRecords = async (page: Page) => {
    expect(await callBackground(page, 'rules/save', BLOCK_RULE)).toMatchObject({ ok: true });

    expect(await callBackground(page, 'rules/save', REDIRECT_RULE)).toMatchObject({ ok: true });

    expect(await callBackground(page, 'mocks/save', MOCK)).toMatchObject({ ok: true });
};

policyTest.describe('the policy section', () => {
    policyTest('says that no policy is set', async ({ optionsPage }) => {
        await openSection(optionsPage, POLICY_SECTION);

        await expect(optionsPage.getByText('No policy is set')).toBeVisible();
    });

    policyTest('shows what the policy sets and follows its changes', async ({ optionsPage }) => {
        await openSection(optionsPage, POLICY_SECTION);
        await setPolicy(optionsPage, POLICY_WITH_ERROR);

        await expect(getPolicyValue(optionsPage, 'Turned-off features')).toHaveText('Mock API, Redirects');

        await expect(getPolicyValue(optionsPage, 'Allowed sites')).toHaveText(
            "None: InterceptKit can't get access to any site",
        );

        await expect(getPolicyValue(optionsPage, 'Your own rules and mocks')).toHaveText(
            "Don't apply: only those of the organization do",
        );

        await expect(getPolicyValue(optionsPage, 'Encryption of secrets')).toHaveText('Not set');

        await expect(optionsPage.getByText('The policy has errors.', { exact: false })).toBeVisible();

        await expect(optionsPage.getByText('$.allowedHosts[1]', { exact: false })).toBeVisible();

        await setPolicy(optionsPage, {});

        await expect(optionsPage.getByText('No policy is set')).toBeVisible();
    });
});

policyTest.describe('records the policy keeps from applying', () => {
    policyTest('are marked in the rules and mocks sections', async ({ optionsPage }) => {
        await saveRecords(optionsPage);
        await setPolicy(optionsPage, { disabledFeatures: [Features.REDIRECT] });
        await optionsPage.reload();

        await expect(
            optionsPage.getByText("Your organization turned off: Redirects. Rules of these types don't apply."),
        ).toBeVisible();

        await expect(getRow(optionsPage, REDIRECT_RULE.name).getByText(BLOCKED_BADGE)).toBeVisible();

        await expect(getRow(optionsPage, BLOCK_RULE.name).getByText(BLOCKED_BADGE)).toHaveCount(0);

        await setPolicy(optionsPage, { allowUserRules: false });

        await expect(
            optionsPage.getByText('Your organization allows only its own rules', { exact: false }),
        ).toBeVisible();

        await expect(getRow(optionsPage, BLOCK_RULE.name).getByText(BLOCKED_BADGE)).toBeVisible();

        await openSection(optionsPage, 'Mock API');

        await expect(
            optionsPage.getByText('Your organization allows only its own mocks', { exact: false }),
        ).toBeVisible();

        await expect(getRow(optionsPage, MOCK.name).getByText(BLOCKED_BADGE)).toBeVisible();

        await setPolicy(optionsPage, { disabledFeatures: [Features.MOCKS] });

        await expect(
            optionsPage.getByText('Your organization turned off the Mock API, so no mock applies.'),
        ).toBeVisible();
    });

    policyTest(
        "leave the browser's rules and come back when the policy changes",
        async ({ optionsPage, serviceWorker }) => {
            expect(await callBackground(optionsPage, 'rules/save', BLOCK_RULE)).toMatchObject({ ok: true });

            await expect.poll(() => getDynamicRules(serviceWorker)).toHaveLength(1);

            await setPolicy(optionsPage, { disabledFeatures: [Features.BLOCK] });

            await expect.poll(() => getDynamicRules(serviceWorker)).toHaveLength(0);

            await setPolicy(optionsPage, {});

            await expect.poll(() => getDynamicRules(serviceWorker)).toHaveLength(1);
        },
    );
});

policyTest.describe('records of the policy bundle', () => {
    policyTest(
        'stand first, apply in the browser and stay out of reach of the user',
        async ({ optionsPage, serviceWorker }) => {
            expect(await callBackground(optionsPage, 'rules/save', REDIRECT_RULE)).toMatchObject({ ok: true });

            await setPolicy(optionsPage, { presetBundle: PRESET_TEXT });

            await expect
                .poll(() => getStoredIds(optionsPage))
                .toEqual({
                    rules: [PRESET_IDS.RULE, REDIRECT_RULE.id],
                    mocks: [PRESET_IDS.MOCK],
                });

            await expect.poll(() => getDynamicRules(serviceWorker)).toHaveLength(2);

            const presetRow = getRow(optionsPage, BLOCK_RULE.name);

            await expect(presetRow.getByText(SOURCE_BADGE)).toBeVisible();

            await expect(presetRow.getByRole('switch')).toBeDisabled();

            await expect(presetRow.getByRole('button', { name: 'Edit' })).toHaveCount(0);

            await expect(getRow(optionsPage, REDIRECT_RULE.name).getByRole('button', { name: 'Edit' })).toBeVisible();

            await openSection(optionsPage, POLICY_SECTION);

            await expect(getPolicyValue(optionsPage, 'Rules and mocks of the organization')).toHaveText(
                'Rules: 1, mocks: 1',
            );

            expect(await callBackground(optionsPage, 'rules/remove', { id: PRESET_IDS.RULE })).toMatchObject({
                ok: false,
                error: { code: RpcErrorCodes.FORBIDDEN },
            });

            expect(await callBackground(optionsPage, 'mocks/remove', { id: PRESET_IDS.MOCK })).toMatchObject({
                ok: false,
                error: { code: RpcErrorCodes.FORBIDDEN },
            });

            expect(
                await callBackground(optionsPage, 'rules/save', { ...BLOCK_RULE, id: PRESET_IDS.RULE }),
            ).toMatchObject({
                ok: false,
                error: { code: RpcErrorCodes.BAD_REQUEST },
            });
        },
    );

    policyTest('go away with the policy, and a broken bundle brings none', async ({ optionsPage }) => {
        expect(await callBackground(optionsPage, 'rules/save', REDIRECT_RULE)).toMatchObject({ ok: true });

        await setPolicy(optionsPage, { presetBundle: PRESET_TEXT });

        await expect
            .poll(() => getStoredIds(optionsPage))
            .toEqual({
                rules: [PRESET_IDS.RULE, REDIRECT_RULE.id],
                mocks: [PRESET_IDS.MOCK],
            });

        await setPolicy(optionsPage, { presetBundle: '{' });

        await expect.poll(() => getStoredIds(optionsPage)).toEqual({ rules: [REDIRECT_RULE.id], mocks: [] });

        await openSection(optionsPage, POLICY_SECTION);

        await expect(getPolicyValue(optionsPage, 'Rules and mocks of the organization')).toHaveText(
            "Don't apply: the bundle has errors",
        );

        await expect(optionsPage.getByText('$.presetBundle: the file is not JSON')).toBeVisible();

        await setPolicy(optionsPage, { presetBundle: PRESET_TEXT });

        await expect
            .poll(() => getStoredIds(optionsPage))
            .toEqual({
                rules: [PRESET_IDS.RULE, REDIRECT_RULE.id],
                mocks: [PRESET_IDS.MOCK],
            });

        await setPolicy(optionsPage, {});

        await expect.poll(() => getStoredIds(optionsPage)).toEqual({ rules: [REDIRECT_RULE.id], mocks: [] });
    });
});

const TEST_SITE_PATTERN = `http://${LOOPBACK_HOST}/*`;

const API_CLIENT_PATH = 'pages/api-client.html';

const NOT_ALLOWED_PATH = '/not-allowed';

const STUBBED_GRANTS = ['*://*.example.com/*', '*://*.bank.test/*', TEST_SITE_PATTERN];

const REVOKED_KEY = 'e2e:revoked';

const getRegisteredScripts = (serviceWorker: Worker) =>
    serviceWorker.evaluate(() => chrome.scripting.getRegisteredContentScripts());

const requestSite = async (page: Page, domain: string) => {
    await page.getByLabel('Domain', { exact: true }).fill(domain);

    await page.getByRole('button', { name: 'Allow access' }).click();
};

const stubHostGrants = (serviceWorker: Worker) =>
    serviceWorker.evaluate(
        ([origins, revokedKey]) => {
            const revoked: string[] = [];

            Object.defineProperty(chrome.permissions, 'getAll', {
                value: async () => ({ origins, permissions: [] }),
            });

            Object.defineProperty(chrome.permissions, 'remove', {
                value: async ({ origins: removed = [] }: chrome.permissions.Permissions) => {
                    revoked.push(...removed);

                    await chrome.storage.session.set({ [revokedKey]: [...revoked] });

                    return true;
                },
            });
        },
        [STUBBED_GRANTS, REVOKED_KEY] as const,
    );

const getRevokedPatterns = (serviceWorker: Worker) =>
    serviceWorker.evaluate(async revokedKey => {
        const stored = await chrome.storage.session.get<Record<string, string[]>>(revokedKey);

        return stored[revokedKey] ?? [];
    }, REVOKED_KEY);

policyTest.describe('allowed hosts', () => {
    policyTest('limit the sites the dashboard asks the browser for', async ({ optionsPage }) => {
        await optionsPage.evaluate(stubAccessRequest);
        await setPolicy(optionsPage, { allowedHosts: ['example.com'] });
        await openSection(optionsPage, 'Sites');

        await expect(
            optionsPage.getByText('Your organization allows access only to these sites: example.com.'),
        ).toBeVisible();

        await requestSite(optionsPage, 'other.test');

        await expect(optionsPage.getByRole('alert')).toHaveText("Your organization doesn't allow access to this site.");

        await requestSite(optionsPage, 'example.com');

        await expect(optionsPage.getByRole('alert')).toContainText('without its subdomains');

        await expect(optionsPage.locator('body')).not.toHaveAttribute(REQUESTED_ORIGINS);

        await optionsPage.getByText('Include subdomains', { exact: true }).click();
        await requestSite(optionsPage, 'example.com');

        await expect(optionsPage.locator('body')).toHaveAttribute(REQUESTED_ORIGINS, '*://example.com/*');
    });

    policyTest('leave a rule for a host outside the list without the Allow button', async ({ optionsPage }) => {
        expect(await callBackground(optionsPage, 'rules/save', BLOCK_RULE)).toMatchObject({ ok: true });

        await setPolicy(optionsPage, { allowedHosts: ['example.com'] });

        const row = getRow(optionsPage, BLOCK_RULE.name);

        await expect(
            row.getByText("Your organization doesn't allow access to ads.example.com", { exact: false }),
        ).toBeVisible();

        await expect(row.getByRole('button', { name: 'Allow', exact: true })).toHaveCount(0);

        await setPolicy(optionsPage, { allowedHosts: ['*.example.com'] });

        await expect(row.getByRole('button', { name: 'Allow', exact: true })).toBeVisible();
    });

    policyTest('take access outside the list away in the background', async ({ optionsPage, serviceWorker }) => {
        await stubHostGrants(serviceWorker);
        await setPolicy(optionsPage, { allowedHosts: ['*.example.com'] });

        await expect.poll(() => getRevokedPatterns(serviceWorker)).toEqual(['*://*.bank.test/*', TEST_SITE_PATTERN]);
    });

    policyTest('keep mocks off a site outside the list', async ({ optionsPage, serviceWorker }) => {
        const site = { pattern: TEST_SITE_PATTERN, mocks: true };

        expect(await callBackground(optionsPage, 'sites/setMocks', site)).toMatchObject({ ok: true });

        expect(await callBackground(optionsPage, 'mocks/save', MOCK)).toMatchObject({ ok: true });

        await expect.poll(() => getRegisteredScripts(serviceWorker)).toHaveLength(2);

        await setPolicy(optionsPage, { allowedHosts: ['example.com'] });

        await expect.poll(() => getRegisteredScripts(serviceWorker)).toHaveLength(0);

        expect(await callBackground(optionsPage, 'sites/setMocks', site)).toMatchObject({
            ok: false,
            error: { code: RpcErrorCodes.FORBIDDEN },
        });
    });

    policyTest('keep the API client from sending outside the list', async ({ context, extensionId, testServer }) => {
        const page = await context.newPage();
        const errors = trackErrors(page);

        await page.goto(`chrome-extension://${extensionId}/${API_CLIENT_PATH}`);
        await setPolicy(page, { allowedHosts: ['example.com'] });

        await page.getByRole('textbox', { name: 'URL', exact: true }).fill(testServer.origin + NOT_ALLOWED_PATH);
        await page.getByRole('button', { name: 'Send', exact: true }).click();

        await expect(page.getByText(`Your organization doesn't allow requests to ${LOOPBACK_HOST}.`)).toBeVisible();

        expect(testServer.getLastRequest(NOT_ALLOWED_PATH)).toBeUndefined();

        const headerRule = { host: LOOPBACK_HOST, headers: [{ name: 'cookie', value: 'a=1' }] };

        expect(await callBackground(page, 'headerRules/apply', headerRule)).toMatchObject({
            ok: false,
            error: { code: RpcErrorCodes.FORBIDDEN },
        });

        expect(errors).toEqual([]);
    });
});

const VAULT_PATH = '/vault-required';

const VAULT_PASSWORD = 'correct horse';

const POPUP_PATH = 'pages/popup.html';

const STAGING: Environment = {
    id: 'staging',
    name: 'Staging',
    variables: [{ key: 'token', value: 'abc', enabled: true, secret: true }],
};

/** The request carries the secret in its path, so the server would see it there */
const SECRET_REQUEST_PATH = `${VAULT_PATH}/abc`;

const getStoredTokenValue = (page: Page) =>
    page.evaluate(async () => {
        const { environments = [] } = await chrome.storage.local.get<{ environments?: Environment[] }>('environments');

        return environments[0]?.variables[0]?.value;
    });

const sendFromApiClient = async (page: Page, url: string) => {
    await page.getByRole('textbox', { name: 'URL', exact: true }).fill(url);

    await page.getByRole('button', { name: 'Send', exact: true }).click();
};

policyTest.describe('the API client under the policy', () => {
    policyTest('keeps typed secrets out until encryption is on', async ({ context, extensionId, testServer }) => {
        const page = await context.newPage();
        const errors = trackErrors(page);

        await page.goto(`chrome-extension://${extensionId}/${API_CLIENT_PATH}`);

        expect(await callBackground(page, 'environments/save', STAGING)).toMatchObject({ ok: true });

        expect(await callBackground(page, 'environments/choose', { activeId: STAGING.id })).toMatchObject({ ok: true });

        await setPolicy(page, { requireVault: true });

        expect(await callBackground(page, 'environments/save', STAGING)).toMatchObject({
            ok: false,
            error: { code: RpcErrorCodes.FORBIDDEN },
        });

        await sendFromApiClient(page, `${testServer.origin}${VAULT_PATH}/{{token}}`);

        await expect(
            page.getByText('Your organization requires secrets to be encrypted: turn on encryption to use token.'),
        ).toBeVisible();

        expect(testServer.getLastRequest(SECRET_REQUEST_PATH)).toBeUndefined();

        expect(await callBackground(page, 'vault/create', { password: VAULT_PASSWORD })).toMatchObject({ ok: true });

        expect(typeof (await getStoredTokenValue(page))).toBe('object');

        expect(await callBackground(page, 'vault/disable', { password: VAULT_PASSWORD })).toMatchObject({
            ok: false,
            error: { code: RpcErrorCodes.FORBIDDEN },
        });

        await page.getByRole('button', { name: 'Vault settings' }).click();

        const settings = page.getByRole('dialog', { name: 'Change the master password' });

        await expect(settings).toBeVisible();

        await expect(settings.getByRole('button', { name: 'Turn off encryption' })).toHaveCount(0);

        await settings.getByRole('button', { name: 'Cancel' }).click();
        await page.getByRole('button', { name: 'Send', exact: true }).click();

        await expect.poll(() => testServer.getLastRequest(SECRET_REQUEST_PATH)).toBeDefined();

        expect(errors).toEqual([]);
    });

    policyTest('turns the client off everywhere it opens from', async ({ context, extensionId, optionsPage }) => {
        await expect(optionsPage.getByRole('link', { name: 'API client' })).toBeVisible();

        await setPolicy(optionsPage, { disabledFeatures: [Features.API_CLIENT] });

        await expect(optionsPage.getByRole('link', { name: 'API client' })).toHaveCount(0);

        const page = await context.newPage();
        const errors = trackErrors(page);

        await page.goto(`chrome-extension://${extensionId}/${API_CLIENT_PATH}`);

        await expect(page.getByText('Your organization turned the API client off')).toBeVisible();

        await expect(page.getByRole('textbox', { name: 'URL', exact: true })).toHaveCount(0);

        const headerRule = { host: 'example.com', headers: [{ name: 'cookie', value: 'a=1' }] };

        expect(await callBackground(page, 'headerRules/apply', headerRule)).toMatchObject({
            ok: false,
            error: { code: RpcErrorCodes.FORBIDDEN },
        });

        await page.goto(`chrome-extension://${extensionId}/${POPUP_PATH}`);

        await expect(page.getByRole('button', { name: 'Open dashboard' })).toBeVisible();

        await expect(page.getByRole('button', { name: 'Open API client' })).toHaveCount(0);

        expect(errors).toEqual([]);
    });
});
