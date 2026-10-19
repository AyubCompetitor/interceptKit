import { defineConfig } from '@playwright/test';

/** E2E tests load the production build from dist/chrome-mv3 */
export default defineConfig({
    testDir: './e2e',
    workers: 1,
    reporter: 'list',
    use: { trace: 'retain-on-failure' },
});
