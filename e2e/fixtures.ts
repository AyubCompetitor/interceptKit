import { test as base, chromium, expect, type BrowserContext, type Page, type Worker } from '@playwright/test';

interface ExtensionFixtures {
    /** Chromium with the extension loaded */
    context: BrowserContext;
    /** The extension's service worker */
    serviceWorker: Worker;
    /** Id of the unpacked extension, the host of its pages */
    extensionId: string;
    /** The dashboard in a new tab; the test fails if the page logs an error */
    optionsPage: Page;
}

const OPTIONS_PAGE_PATH = 'pages/options.html';

/** URL to a file system path, without depending on Node typings. */
const toFilePath = (url: URL): string => {
    const path = decodeURIComponent(url.pathname);
    const pattern = /^\/[A-Za-z]:\//;

    if (pattern.test(path)) {
        return path.slice(1);
    }

    return path;
};

const CHROME_MV_3_PATH = '../dist/chrome-mv3';

const EXTENSION_PREFIXES = {
    DISABLE: '--disable-extensions-except',
    LOAD: '--load-extension',
};

const EXTENSION_PATH = toFilePath(new URL(CHROME_MV_3_PATH, import.meta.url));

const LAUNCH_PERSIST_CTX = {
    channel: 'chromium',
    locale: 'en-US',
    args: [`${EXTENSION_PREFIXES.DISABLE}=${EXTENSION_PATH}`, `${EXTENSION_PREFIXES.LOAD}=${EXTENSION_PATH}`],
};

/**
 * Loads the unpacked build into Playwright's Chromium. Google Chrome and Edge removed the
 * side-loading flags, so the bundled Chromium (channel "chromium") is required.
 */
export const test = base.extend<ExtensionFixtures>({
    context: async ({}, use) => {
        const context = await chromium.launchPersistentContext('', LAUNCH_PERSIST_CTX);

        await use(context);
        await context.close();
    },

    serviceWorker: async ({ context }, use) => {
        const [ctxWorker] = context.serviceWorkers();
        const worker = ctxWorker ?? (await context.waitForEvent('serviceworker'));

        await use(worker);
    },

    extensionId: async ({ serviceWorker }, use) => {
        const workerUrl = serviceWorker.url();

        await use(new URL(workerUrl).host);
    },

    optionsPage: async ({ context, extensionId }, use) => {
        const page = await context.newPage();
        const errors = trackErrors(page);

        await page.goto(`chrome-extension://${extensionId}/${OPTIONS_PAGE_PATH}`);

        await use(page);

        expect(errors).toEqual([]);
    },
});

export { expect } from '@playwright/test';

/** Collects console errors and uncaught exceptions, including CSP violations. */
export function trackErrors(page: Page): string[] {
    const errors: string[] = [];

    page.on('console', message => {
        if (message.type() === 'error') {
            errors.push(message.text());
        }
    });

    page.on('pageerror', error => errors.push(error.message));

    return errors;
}
