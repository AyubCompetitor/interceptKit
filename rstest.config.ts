import { pluginReact } from '@rsbuild/plugin-react';
import { defineConfig } from '@rstest/core';

export default defineConfig({
    include: ['src/**/*.test.ts'],
    testEnvironment: 'node',
    /** Compiles JSX like the extension build does: a module under test may pull in components, e.g. via #shared/ui */
    plugins: [pluginReact()],
    coverage: {
        provider: 'istanbul',
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/**/__tests__/**', 'src/app/entrypoints/**'],
        reportsDirectory: 'coverage',
    },
});
