import type { Page } from '@playwright/test';

import { expect, test } from './fixtures.ts';

const REQUESTED_ORIGINS = 'data-requested-origins';

/**
 * Playwright cannot answer the browser's permission prompt, so the request is replaced
 * with a refusal that leaves the requested origins on <body> for the test to read.
 */
const stubAccessRequest = () => {
    Object.defineProperty(chrome.permissions, 'request', {
        value: async ({ origins = [] }: chrome.permissions.Permissions) => {
            document.body.dataset.requestedOrigins = origins.join(' ');

            return false;
        },
    });
};

const requestAccess = async (page: Page, domain: string) => {
    await page.evaluate(stubAccessRequest);

    await page.getByLabel('Domain', { exact: true }).fill(domain);

    await page.getByRole('button', { name: 'Allow access' }).click();
};

test('a domain is requested with its subdomains through the browser prompt', async ({ optionsPage }) => {
    await expect(optionsPage.getByText('No sites yet.')).toBeVisible();

    await requestAccess(optionsPage, 'https://Example.com/login');

    await expect(optionsPage.locator('body')).toHaveAttribute(REQUESTED_ORIGINS, '*://*.example.com/*');

    await expect(optionsPage.getByRole('alert')).toHaveText('Access was not granted.');
});

test('an invalid domain is refused without asking the browser', async ({ optionsPage }) => {
    await requestAccess(optionsPage, 'not a domain');

    await expect(optionsPage.getByRole('alert')).toHaveText('Enter a domain such as example.com or localhost.');

    await expect(optionsPage.locator('body')).not.toHaveAttribute(REQUESTED_ORIGINS);
});
