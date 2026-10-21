import type { Page } from '@playwright/test';

import { expect, openSection, REQUESTED_ORIGINS, stubAccessRequest, test } from './fixtures.ts';

const requestAccess = async (page: Page, domain: string) => {
    await page.evaluate(stubAccessRequest);

    await page.getByLabel('Domain', { exact: true }).fill(domain);

    await page.getByRole('button', { name: 'Allow access' }).click();
};

test('a domain is requested with its subdomains through the browser prompt', async ({ optionsPage }) => {
    await openSection(optionsPage, 'Sites');

    await expect(optionsPage.getByText('No sites yet', { exact: true })).toBeVisible();

    await requestAccess(optionsPage, 'https://Example.com/login');

    await expect(optionsPage.locator('body')).toHaveAttribute(REQUESTED_ORIGINS, '*://*.example.com/*');

    await expect(optionsPage.getByRole('alert')).toHaveText("Access wasn't granted.");
});

test('an invalid domain is refused without asking the browser', async ({ optionsPage }) => {
    await openSection(optionsPage, 'Sites');

    await requestAccess(optionsPage, 'not a domain');

    await expect(optionsPage.getByRole('alert')).toHaveText('Enter a domain, for example example.com or localhost.');

    await expect(optionsPage.locator('body')).not.toHaveAttribute(REQUESTED_ORIGINS);
});
