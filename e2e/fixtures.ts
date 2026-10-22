import { test as base, chromium, expect, type BrowserContext, type Page, type Worker } from '@playwright/test';
import { cpSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { FOREIGN_HOST, LOOPBACK_HOST, startTestServer, type TestServer } from './testServer.ts';

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

interface ExtensionWorkerFixtures {
    /** Folder of the unpacked build the browser loads */
    extensionPath: string;
}

interface NetworkWorkerFixtures {
    /** Local HTTP server shared by the tests of a worker */
    testServer: TestServer;
}

const OPTIONS_PAGE_PATH = 'pages/options.html';

const CHROME_MV_3_PATH = '../dist/chrome-mv3';

const EXTENSION_PREFIXES = {
    DISABLE: '--disable-extensions-except',
    LOAD: '--load-extension',
};

export const EXTENSION_PATH = fileURLToPath(new URL(CHROME_MV_3_PATH, import.meta.url));

/** Pages on the foreign host load from the test server, while the extension has no access to that host */
const HOST_RESOLVER_RULES = `--host-resolver-rules=MAP ${FOREIGN_HOST} ${LOOPBACK_HOST}`;

/** A pattern without a port covers the test server on any port */
const NETWORK_HOST_PERMISSIONS = [`http://${LOOPBACK_HOST}/*`];

const NETWORK_EXTENSION_FOLDER = 'chrome-mv3-host-access';

const getLaunchPersistCtx = (extensionPath: string) => ({
    channel: 'chromium',
    locale: 'en-US',
    args: [
        `${EXTENSION_PREFIXES.DISABLE}=${extensionPath}`,
        `${EXTENSION_PREFIXES.LOAD}=${extensionPath}`,
        HOST_RESOLVER_RULES,
    ],
});

/** Copies the build with install-time host access: tests cannot answer the browser's permission prompt */
const copyExtensionWithHostAccess = (outputDir: string): string => {
    const extensionPath = join(outputDir, NETWORK_EXTENSION_FOLDER);
    const manifestPath = join(extensionPath, 'manifest.json');

    cpSync(EXTENSION_PATH, extensionPath, { recursive: true });

    const manifest: chrome.runtime.ManifestV3 = JSON.parse(readFileSync(manifestPath, 'utf8'));

    writeFileSync(manifestPath, JSON.stringify({ ...manifest, host_permissions: NETWORK_HOST_PERMISSIONS }));

    return extensionPath;
};

/**
 * Loads the unpacked build into Playwright's Chromium. Google Chrome and Edge removed the
 * side-loading flags, so the bundled Chromium (channel "chromium") is required.
 */
export const test = base.extend<ExtensionFixtures, ExtensionWorkerFixtures>({
    extensionPath: [EXTENSION_PATH, { scope: 'worker' }],

    context: async ({ extensionPath }, use) => {
        const context = await chromium.launchPersistentContext('', getLaunchPersistCtx(extensionPath));

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

/** Tests of real interception: a local HTTP server and a build with access to it */
export const networkTest = test.extend<{}, NetworkWorkerFixtures>({
    extensionPath: [
        async ({}, use, workerInfo) => {
            await use(copyExtensionWithHostAccess(workerInfo.project.outputDir));
        },
        { scope: 'worker' },
    ],

    testServer: [
        async ({}, use) => {
            const server = await startTestServer();

            await use(server);
            await server.close();
        },
        { scope: 'worker' },
    ],
});

export { expect } from '@playwright/test';

/** Attribute of <body> where the stubbed prompt leaves the origins it was asked for */
export const REQUESTED_ORIGINS = 'data-requested-origins';

/**
 * Playwright cannot answer the browser's permission prompt, so the request is replaced
 * with a refusal that leaves the requested origins on <body> for the test to read.
 */
export const stubAccessRequest = () => {
    Object.defineProperty(chrome.permissions, 'request', {
        value: async ({ origins = [] }: chrome.permissions.Permissions) => {
            document.body.dataset.requestedOrigins = origins.join(' ');

            return false;
        },
    });
};

/** Opens a dashboard section from the sidebar */
export const openSection = async (page: Page, name: string) => {
    await page.getByRole('link', { name, exact: true }).click();

    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
};

/** Calls a background method the way extension pages do */
export const callBackground = (page: Page, method: string, params: unknown) =>
    page.evaluate(message => chrome.runtime.sendMessage(message), { ik: 1, method, params });

export const getDynamicRules = (serviceWorker: Worker) =>
    serviceWorker.evaluate(() => chrome.declarativeNetRequest.getDynamicRules());

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
