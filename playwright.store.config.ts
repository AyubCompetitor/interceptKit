import { defineConfig } from '@playwright/test';

/** Screenshots for the store listings, taken on the production build in dist/chrome-mv3 */
export default defineConfig({
    testDir: './store',
    testMatch: 'screenshots.ts',
    workers: 1,
    reporter: 'list',
});
