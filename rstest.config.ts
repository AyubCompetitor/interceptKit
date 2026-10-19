import { defineConfig } from '@rstest/core';

export default defineConfig({
    include: ['src/**/*.test.ts'],
    testEnvironment: 'node',
    coverage: {
        provider: 'istanbul',
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/**/*.test.ts', 'src/app/entrypoints/**'],
        reportsDirectory: 'coverage',
    },
});
