import { expect, openSection, test, trackErrors } from './fixtures.ts';

const CSP_META = 'meta[http-equiv="Content-Security-Policy"]';
const EXTENSION_NAME = 'InterceptKit';

const getExtensionPath = (extensionId: string) => `chrome-extension://${extensionId}/pages/`;

test('manifest requests only the reviewed permissions', async ({ serviceWorker }) => {
    const manifest = await serviceWorker.evaluate(() => chrome.runtime.getManifest());

    expect(manifest.manifest_version).toBe(3);

    expect(manifest.permissions).toEqual(['storage', 'declarativeNetRequestWithHostAccess']);

    expect(manifest.host_permissions ?? []).toEqual([]);

    expect(manifest.optional_host_permissions).toEqual(['*://*/*']);

    expect(manifest.content_scripts ?? []).toEqual([]);

    expect(manifest.web_accessible_resources ?? []).toEqual([]);
});

test('storage.local can be closed to content scripts', async ({ serviceWorker }) => {
    const restricted = serviceWorker.evaluate(() =>
        chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' }),
    );

    await expect(restricted).resolves.toBeUndefined();
});

test('popup renders in English under an offline CSP', async ({ context, extensionId }) => {
    const page = await context.newPage();
    const errors = trackErrors(page);
    const popup = getExtensionPath(extensionId) + 'popup.html';

    await page.goto(popup);

    await expect(page.getByRole('heading', { name: EXTENSION_NAME })).toBeVisible();

    await expect(page.getByRole('button', { name: 'Open dashboard' })).toBeVisible();

    await expect(page.locator(CSP_META)).toHaveAttribute('content', "connect-src 'none'");

    expect(errors).toEqual([]);
});

test('dashboard switches the interface to Russian and remembers it', async ({ optionsPage }) => {
    await openSection(optionsPage, 'Settings');

    await optionsPage.getByRole('combobox', { name: 'Interface language', exact: true }).selectOption('ru');

    await expect(optionsPage.getByRole('heading', { name: 'Настройки' })).toBeVisible();

    await expect(optionsPage.locator('html')).toHaveAttribute('lang', 'ru');

    await optionsPage.reload();

    await expect(optionsPage.getByRole('combobox', { name: 'Язык интерфейса', exact: true })).toHaveValue('ru');
});

test('dashboard is dark by default and remembers another theme', async ({ optionsPage }) => {
    const lightTheme = optionsPage.getByRole('radio', { name: 'Light', exact: true });

    await expect(optionsPage.locator('html')).toHaveAttribute('data-theme', 'dark');

    await openSection(optionsPage, 'Settings');

    await lightTheme.click();

    await expect(lightTheme).toBeChecked();

    await expect(optionsPage.locator('html')).toHaveAttribute('data-theme', 'light');

    await optionsPage.reload();

    await expect(optionsPage.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('API client page may use the network', async ({ context, extensionId }) => {
    const page = await context.newPage();
    const errors = trackErrors(page);
    const apiClient = getExtensionPath(extensionId) + 'api-client.html';

    await page.goto(apiClient);

    await expect(page.getByRole('heading', { name: 'API client' })).toBeVisible();

    await expect(page.locator(CSP_META)).toHaveCount(0);

    expect(errors).toEqual([]);
});
