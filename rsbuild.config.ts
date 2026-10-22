import { defineConfig, type RsbuildPlugin } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

import { buildManifest } from './build/manifest.ts';

const OUT = 'dist/chrome-mv3';
const OFFLINE_PAGES = new Set(['popup', 'options']);

const entry = (path: string) => `./src/app/entrypoints/${path}`;

const pluginManifest = (): RsbuildPlugin => ({
    name: 'interceptkit:manifest',
    setup(api) {
        api.processAssets({ stage: 'additional', environments: ['pages'] }, ({ compilation, sources }) => {
            const manifest = `${JSON.stringify(buildManifest(), null, 2)}\n`;
            compilation.emitAsset('../manifest.json', new sources.RawSource(manifest));
        });
    },
});

export default defineConfig(({ env }) => ({
    plugins: [pluginReact({ reactCompiler: true }), pluginManifest()],
    server: { host: '127.0.0.1', port: 3000, strictPort: true, publicDir: { copyOnBuild: false } },
    output: {
        filenameHash: false,
        legalComments: 'none',
        overrideBrowserslist: ['chrome >= 140', 'edge >= 140'],
    },
    environments: {
        pages: {
            source: {
                entry: {
                    popup: entry('popup/main.tsx'),
                    options: entry('options/main.tsx'),
                    'api-client': entry('api-client/main.tsx'),
                },
            },
            output: {
                target: 'web',
                distPath: { root: `${OUT}/pages` },
                assetPrefix: './',
                copy: [
                    { from: 'public', to: '..' },
                    { from: 'src/shared/i18n/messages/en.json', to: '../_locales/en/messages.json' },
                    { from: 'src/shared/i18n/messages/ru.json', to: '../_locales/ru/messages.json' },
                ],
            },
            html: {
                title: 'InterceptKit',
                meta: ({ value, entryName }) =>
                    env === 'production' && OFFLINE_PAGES.has(entryName)
                        ? {
                              ...value,
                              'csp-offline': {
                                  'http-equiv': 'Content-Security-Policy',
                                  content: "connect-src 'none'",
                              },
                          }
                        : value,
            },
            dev: {
                writeToDisk: true,
                assetPrefix: './',
                client: { protocol: 'ws', host: '127.0.0.1', port: 3000 },
            },
        },
        background: {
            source: { entry: { background: entry('background.ts') } },
            output: { target: 'web-worker', distPath: { root: `${OUT}/background`, js: '' } },
            performance: { chunkSplit: { strategy: 'all-in-one' } },
            dev: { writeToDisk: true, hmr: false, liveReload: false },
        },
        /** Scripts the browser injects into web pages: self-contained files, no HTML, no dev client */
        content: {
            source: { entry: { interceptor: entry('interceptor.ts'), bridge: entry('bridge.ts') } },
            output: { target: 'web', distPath: { root: `${OUT}/content`, js: '' } },
            performance: { chunkSplit: { strategy: 'all-in-one' } },
            tools: { htmlPlugin: false },
            dev: { writeToDisk: true, hmr: false, liveReload: false },
        },
    },
}));
