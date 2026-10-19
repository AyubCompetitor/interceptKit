# InterceptKit

Intercept, mock and redirect HTTP requests, plus a lightweight API client, in one open-source browser extension.

Local-first by design: no backend, no accounts, no telemetry. Everything you create stays in your browser.

> **Status:** early development. The project skeleton, data model and storage are in place; redirects, headers and blocking come next. Not usable yet.

## Principles

- **No servers, no traffic of its own.** The extension sends only the requests you start in the API client.
- **No remote code.** No `eval`, `new Function` or `unsafe-eval`; a strict Content Security Policy.
- **Minimal permissions.** Access to a site is requested at runtime, per site, never `<all_urls>` at install. Every permission is explained in [docs/PERMISSIONS.md](docs/PERMISSIONS.md).
- **Few, reviewed dependencies.** The lockfile is committed; new versions are installed only after 7 days.
- **Your data stays local.** Everything lives in `chrome.storage` and IndexedDB; sharing works through JSON export and import.

## Development

Requirements: Node.js 24 LTS with corepack (bundled with Node 24).

```sh
corepack enable pnpm                   # once; the pnpm version is pinned in package.json
pnpm install
pnpm exec playwright install chromium  # once, for end-to-end tests
```

| Command                            | What it does                                                                   |
| ---------------------------------- | ------------------------------------------------------------------------------ |
| `pnpm dev`                         | Builds into `dist/chrome-mv3` on every change; extension pages update in place |
| `pnpm build`                       | Production build into `dist/chrome-mv3`                                        |
| `pnpm typecheck`                   | Type check with TypeScript 7                                                   |
| `pnpm lint`                        | oxlint, including type-aware rules and architecture boundaries                 |
| `pnpm format`, `pnpm format:check` | Prettier                                                                       |
| `pnpm test`, `pnpm test:coverage`  | Unit tests (Rstest)                                                            |
| `pnpm test:e2e`                    | Production build plus Playwright tests with the extension loaded in Chromium   |
| `pnpm check`                       | All of the above                                                               |

To load the extension, open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked** and select `dist/chrome-mv3`. While `pnpm dev` runs, extension pages refresh on their own; after a service worker change, press the reload button on the extension card.

Chrome and Edge 140 or newer are required.

How the code is organized: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
