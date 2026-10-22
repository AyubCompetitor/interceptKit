import type { Locator, Page } from '@playwright/test';

import { DnrTypes, HeaderOperations, ResourceTypes, RuleTargetTypes, RuleTypes } from '#entities/rule';
import { Sources, SyntaxTypes } from '#shared/lib';
import { RpcErrorCodes } from '#shared/messaging';

import { callBackground, expect, getDynamicRules, REQUESTED_ORIGINS, stubAccessRequest, test } from './fixtures.ts';

const BLOCK_RULE = {
    id: 'ads',
    name: 'Block ads',
    enabled: true,
    source: Sources.USER,
    type: RuleTypes.BLOCK,
    match: {
        url: {
            syntaxType: SyntaxTypes.FILTER,
            value: '||ads.example.com^',
        },
    },
};

const COMPILED_BLOCK_RULE = {
    id: 1,
    priority: 1,
    action: {
        type: DnrTypes.BLOCK,
    },
    condition: {
        urlFilter: '||ads.example.com^',
    },
};

const AD_REQUEST = {
    url: 'https://ads.example.com/banner.js',
    type: ResourceTypes.SCRIPT,
} as const;

const SUBSTITUTION_RULE = {
    id: 'old-api',
    name: 'Move the old API',
    enabled: true,
    source: Sources.USER,
    type: RuleTypes.REDIRECT,
    match: { url: { syntaxType: SyntaxTypes.RGX, value: '^https://old\\.example\\.com/(.*)$' } },
    to: { targetType: RuleTargetTypes.RGX_SUBSTITUTION, value: 'https://new.example.com/\\1' },
};

/** Field names here belong to the DNR API: the browser refuses the whole rule list over a wrong one */
const COMPILED_SUBSTITUTION_RULE = {
    action: {
        type: DnrTypes.REDIRECT,
        redirect: {
            regexSubstitution: 'https://new.example.com/\\1',
        },
    },
    condition: {
        regexFilter: '^https://old\\.example\\.com/(.*)$',
    },
};

const COMPILED_HEADER_ACTION = {
    type: DnrTypes.MODIFY_HEADERS,
    requestHeaders: [
        {
            header: 'x-debug',
            operation: HeaderOperations.SET,
            value: '1',
        },
    ],
};

/** Fields every rule has, filled in the editor */
interface RuleBasics {
    /** Name of the rule */
    name: string;
    /** Label of the action choice */
    action: string;
    /** URL pattern of the requests */
    pattern: string;
}

/** Controls sit inside their labels, so a label's text also holds a select's options: look them up by role */
const getTextbox = (scope: Locator, name: string) => scope.getByRole('textbox', { name, exact: true });

const getRuleRow = (page: Page, name: string) => page.getByRole('listitem').filter({ hasText: name });

const openNewRule = async (page: Page) => {
    await page.getByRole('button', { name: 'New rule' }).click();

    return page.getByRole('dialog', { name: 'New rule' });
};

const fillRuleBasics = async (editor: Locator, { name, action, pattern }: RuleBasics) => {
    await getTextbox(editor, 'Name').fill(name);

    await editor.getByRole('radio', { name: action, exact: true }).check();

    await getTextbox(editor, 'URL pattern').fill(pattern);
};

test('a saved rule reaches the browser but does nothing without host access', async ({
    optionsPage,
    serviceWorker,
}) => {
    expect(await callBackground(optionsPage, 'rules/save', BLOCK_RULE)).toEqual({ ok: true, result: BLOCK_RULE });

    await expect.poll(() => getDynamicRules(serviceWorker)).toMatchObject([COMPILED_BLOCK_RULE]);

    const [dynamicRule] = await getDynamicRules(serviceWorker);

    expect(dynamicRule?.condition.resourceTypes).toContain(ResourceTypes.MAIN_FRAME);

    const result = await serviceWorker.evaluate(
        request => chrome.declarativeNetRequest.testMatchOutcome(request),
        AD_REQUEST,
    );

    expect(result.matchedRules).toEqual([]);
});

test('a regex substitution reaches the browser', async ({ optionsPage, serviceWorker }) => {
    expect(await callBackground(optionsPage, 'rules/save', SUBSTITUTION_RULE)).toMatchObject({ ok: true });

    await expect.poll(() => getDynamicRules(serviceWorker)).toMatchObject([COMPILED_SUBSTITUTION_RULE]);
});

test('the interception switch clears and restores the browser rules', async ({ optionsPage, serviceWorker }) => {
    const interception = optionsPage.getByRole('switch', { name: 'Intercept requests' });

    await callBackground(optionsPage, 'rules/save', BLOCK_RULE);

    await expect.poll(() => getDynamicRules(serviceWorker)).toHaveLength(1);

    await interception.click();

    await expect(interception).not.toBeChecked();

    await expect.poll(() => getDynamicRules(serviceWorker)).toHaveLength(0);

    await interception.click();

    await expect.poll(() => getDynamicRules(serviceWorker)).toHaveLength(1);
});

test('a regex the browser cannot run is refused with a reason', async ({ optionsPage }) => {
    const referenceRule = { ...BLOCK_RULE, match: { url: { syntaxType: SyntaxTypes.RGX, value: '(a)\\1' } } };

    expect(await callBackground(optionsPage, 'rules/save', referenceRule)).toMatchObject({
        ok: false,
        error: { code: RpcErrorCodes.BAD_REQUEST },
    });
});

test('a rule without host access offers to request it', async ({ optionsPage }) => {
    const row = getRuleRow(optionsPage, 'Block ads');

    await callBackground(optionsPage, 'rules/save', BLOCK_RULE);

    await expect(row).toContainText('no access to ads.example.com');

    await optionsPage.evaluate(stubAccessRequest);

    await row.getByRole('button', { name: 'Allow' }).click();

    await expect(optionsPage.locator('body')).toHaveAttribute(REQUESTED_ORIGINS, '*://*.ads.example.com/*');
});

test.describe('the rule editor', () => {
    test('creates a rule that reaches the browser, then switches it off and deletes it', async ({
        optionsPage,
        serviceWorker,
    }) => {
        const editor = await openNewRule(optionsPage);
        const ruleSwitch = optionsPage.getByRole('switch', { name: 'Block ads' });

        await fillRuleBasics(editor, { name: 'Block ads', action: 'Block', pattern: '||ads.example.com^' });

        await editor.getByRole('button', { name: 'Save' }).click();

        await expect(editor).toBeHidden();

        await expect.poll(() => getDynamicRules(serviceWorker)).toMatchObject([COMPILED_BLOCK_RULE]);

        await ruleSwitch.click();

        await expect(ruleSwitch).not.toBeChecked();

        await expect.poll(() => getDynamicRules(serviceWorker)).toEqual([]);

        await getRuleRow(optionsPage, 'Block ads').getByRole('button', { name: 'Delete' }).click();

        await optionsPage.getByRole('dialog', { name: 'Delete rule?' }).getByRole('button', { name: 'Delete' }).click();

        await expect(optionsPage.getByText('No rules yet', { exact: true })).toBeVisible();
    });

    test('edits a rule in place', async ({ optionsPage }) => {
        const editor = optionsPage.getByRole('dialog', { name: 'Edit rule' });

        await callBackground(optionsPage, 'rules/save', BLOCK_RULE);

        await getRuleRow(optionsPage, 'Block ads').getByRole('button', { name: 'Edit' }).click();

        await expect(getTextbox(editor, 'URL pattern')).toHaveValue('||ads.example.com^');

        await getTextbox(editor, 'Name').fill('Block banners');

        await editor.getByRole('button', { name: 'Save' }).click();

        await expect(optionsPage.getByRole('switch', { name: 'Block banners' })).toBeVisible();

        await expect(optionsPage.getByRole('switch', { name: 'Block ads' })).toHaveCount(0);
    });

    test('turns header rows into header changes', async ({ optionsPage, serviceWorker }) => {
        const editor = await openNewRule(optionsPage);
        const requestHeaders = editor.getByRole('group', { name: 'Request headers' });

        await fillRuleBasics(editor, { name: 'Debug header', action: 'Modify headers', pattern: '||api.example.com/' });

        await requestHeaders.getByRole('button', { name: 'Add header' }).click();

        await getTextbox(requestHeaders, 'Header').fill('X-Debug');

        await getTextbox(requestHeaders, 'Value').fill('1');

        await editor.getByRole('button', { name: 'Save' }).click();

        await expect.poll(() => getDynamicRules(serviceWorker)).toMatchObject([{ action: COMPILED_HEADER_ACTION }]);
    });

    test('shows why the background refused a rule and stays open', async ({ optionsPage }) => {
        const editor = await openNewRule(optionsPage);

        await fillRuleBasics(editor, { name: 'Leading wildcard', action: 'Block', pattern: '||*.example.com' });

        await editor.getByRole('button', { name: 'Save' }).click();

        await expect(editor.getByRole('alert')).toContainText('must not start with ||*');

        await expect(editor).toBeVisible();
    });
});
