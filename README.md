# XRequest

Intercept, mock and redirect HTTP requests, plus a lightweight API client, in one open-source browser extension.

Local-first by design: no backend, no accounts, no telemetry. Everything you create stays in your browser.

> **Status:** version 0.1, before its first release in the Chrome Web Store and Edge Add-ons.

## Features

- **Rules:** redirect requests, change request and response headers, block requests. The browser applies them itself through `declarativeNetRequest`, only on sites you allow.
- **Mock API:** answer a page's `fetch` and XHR requests with your own status, headers, body and delay.
- **API client:** requests in tabs, collections with folders, environments with `{{variables}}`, history, import from cURL, Postman and OpenAPI, export to cURL, and secrets encrypted with a master password.
- **Import and export:** rules, mocks, environments and collections as a JSON file that is easy to keep in git.
- **Organization policy:** administrators can limit sites and features, require encryption and hand out rules ([docs/ENTERPRISE.md](docs/ENTERPRISE.md)).

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

## Releasing

| Command                  | What it does                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------------ |
| `pnpm release`           | Production build plus `dist/xrequest-<version>.zip` with the licenses, and its SHA-256     |
| `pnpm store:screenshots` | Production build plus the store screenshots in `store/screenshots`, in English and Russian |
| `pnpm icons`             | Draws the extension icons and the Edge logo from the brand glyph                           |

The archive has fixed dates and a fixed file order, so two builds of the same commit with the same tools give the same bytes. The texts and answers for the store dashboards are in [store/LISTING.md](store/LISTING.md), the privacy policy in [PRIVACY.md](PRIVACY.md).

## Security and administration

- [SECURITY.md](SECURITY.md) — how to report a vulnerability and how the extension protects you.
- [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md) — what is protected, from whom, and what is left.
- [docs/PERMISSIONS.md](docs/PERMISSIONS.md) — every permission and why it is needed.
- [docs/ENTERPRISE.md](docs/ENTERPRISE.md) — installing for an organization and the administrator's policy.
