# Architecture

InterceptKit is a Manifest V3 extension for Chrome and Edge 140+. This document describes how the code is organized and which rules keep it secure. The rules below are enforced by tooling, not only by convention.

## Execution contexts

| Context                     | Entry point                         | Runs                                        | Talks to                                                     |
| --------------------------- | ----------------------------------- | ------------------------------------------- | ------------------------------------------------------------ |
| Service worker (background) | `src/app/entrypoints/background.ts` | On demand; Chrome stops it after ~30 s idle | `chrome.storage`, `declarativeNetRequest`, later `scripting` |
| Popup                       | `src/app/entrypoints/popup/`        | While the toolbar popup is open             | Storage (read), background (RPC)                             |
| Dashboard (options page)    | `src/app/entrypoints/options/`      | In a tab                                    | Storage (read), background (RPC), host access requests       |
| API client                  | `src/app/entrypoints/api-client/`   | In a tab                                    | Later: the network, only for requests the user sends         |
| Content scripts             | Later                               | Pages of sites where the user enabled mocks | Background (RPC), the page through `postMessage`             |

## Code layout: Feature-Sliced Design

All contexts share one [Feature-Sliced Design](https://feature-sliced.design) tree. A layer may import only from layers below it:

```
src/
├── app/        Entry points and initialization of every context (service worker, pages)
├── pages/      One slice per extension page: popup, options, api-client
├── widgets/    Large UI blocks reused by several pages (none yet)
├── features/   User interactions reused in several places (none yet)
├── entities/   Business entities and business logic: rule, mock, site, config, request, environment
└── shared/     Infrastructure without business logic: lib, config, messaging, platform, i18n, ui
```

Rules:

- **Import only downwards.** No imports between slices of the same layer.
- **Public API only.** A slice is imported through its `index.ts`. The aliases in `package.json` `imports` (`#entities/*` → `src/entities/*/index.ts`) make deep imports unresolvable for TypeScript, the bundler and the test runner alike. Inside a slice, use relative imports; `../../` out of a slice is rejected by the linter.
- **Pages first.** Code lives in its page until it is genuinely needed in two places.
- **Segments by purpose.** `ui` holds what is displayed, including option labels; `model` holds data and business logic, such as the hooks that save rules or grant site access; `lib` holds library code with no business logic, such as modal state or bindings of form fields; `api` holds requests. A hook goes where its content belongs, not into a folder for hooks. Files are named after their domain (`ruleDraft.ts`), never `types.ts` or `utils.ts`.
- **Entities and `shared/lib` are universal.** They use no React, no `chrome.*`, no DOM and no network, so every context can import them, including a script running inside a web page, and they are unit-tested in Node. Contracts such as storage keys and RPC methods are declared in entities as plain data (`defineStoreItem`, `defineMethod`); `shared/platform` and `shared/messaging` execute them.
- **Network access** (`fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`) is allowed only in `src/pages/api-client/api/`.

These rules are checked by `oxlint` (`.oxlintrc.json`): `no-restricted-imports` per layer, `no-restricted-globals` for purity and for network access.

## Data

| Store                    | Contents                                               | Notes                                                                                                                 |
| ------------------------ | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `chrome.storage.local`   | `settings`, `rules`, `mocks`, `sites`, `schemaVersion` | Closed to content scripts: the service worker calls `storage.local.setAccessLevel('TRUSTED_CONTEXTS')` on every start |
| `chrome.storage.session` | Short-lived state                                      | In memory only; closed to content scripts by default                                                                  |
| `chrome.storage.managed` | Administrator policy                                   | Read-only; validated field by field, see below                                                                        |
| IndexedDB                | API client environments and history                    | Not yet; content scripts cannot reach the extension's IndexedDB                                                       |

Every value is validated on read and on write with the dependency-free validators in `shared/lib/validation.ts`. Corrupted or foreign data degrades to defaults with a warning instead of crashing; invalid data is never written. The layout of `chrome.storage.local` is versioned (`schemaVersion`); migrations run in the service worker before any write.

**Administrator policy fails closed.** If a restricting policy field is present but invalid, it is read in its most restrictive form (for example, a broken `allowedHosts` allows no hosts) and the problem is reported, so an administrator's typo never silently lifts a restriction.

## Messaging

Extension pages read storage directly and react to `chrome.storage.onChanged`. They never write interception settings themselves: they executeRpc the service worker, which is the only writer.

```
page ──RPC (runtime.sendMessage)──▶ service worker ──▶ chrome.storage.local
  ▲                                                          │
  └──────────────────── storage.onChanged ◀──────────────────┘
```

- Envelope: `{ ik: 1, method, params }`, answered with `{ ok: true, result }` or `{ ok: false, error: { code, message } }`.
- The router accepts only senders from this extension. Each method declares who may executeRpc it (extension pages, or also content scripts); the caller's origin is taken from what the browser reports, never from the message.
- Parameters are validated before a handler runs. A handler rejects bad input with `RpcError` and a reason; any other error is logged and returned as a generic `internal` error.
- Writes go through a serial queue, so concurrent updates are never lost.

## Rules

Redirect, header and block rules are applied by the browser itself through `declarativeNetRequest`: the extension never sees request contents.

```
rules + settings + policy ──▶ selectActiveRules ──▶ compileRules ──▶ updateDynamicRules
```

- The service worker rebuilds the browser's dynamic rules when the extension is installed or the browser starts, and whenever rules, settings or the administrator's policy change. The sync runs in the same serial queue as writes and replaces all dynamic rules in one atomic update.
- `selectActiveRules` drops disabled rules, everything when interception is switched off, and what the policy forbids (disabled features, user rules when `allowUserRules` is false).
- `compileRules` is a pure function in `entities/rule`. The first rule in the list wins: priorities follow the order, because the browser leaves equal priorities unordered. A rule without resource types applies to all of them, including top-level pages.
- Saving a rule checks what only the browser knows: whether RE2 can run its regex, and the limit of regex rules.
- The dashboard edits a rule through a form state that keeps the fields of every rule type, so switching the type loses nothing. Saving sends the whole rule to the service worker; if it refuses, the editor shows the reason.
- **Rules are inert without host access.** The browser applies a rule only when the extension has access to both the requested site and the page that made the request; nothing is granted at install.

## Site access

Host access is the user's decision, made one site at a time:

- The dashboard's Sites section asks the browser for `*://<domain>/*`, or for `*://*.<domain>/*` with subdomains, which also covers the domain itself. Both cover any port. The browser shows its own prompt, and only inside the user's click.
- The list shows what the browser has actually granted (`permissions.getAll`) and reloads on `permissions.onAdded` and `onRemoved`. There is no copy in storage that could drift from it.
- Removing a site revokes the permission, and rules stop working there at once.

## Localization

The UI ships in English and Russian. Strings live in `src/shared/i18n/messages/<locale>.json` in the `chrome.i18n` format; the build copies them to `_locales/`, which also localizes the manifest. Translation in pages uses our own `t()` with typed keys, so the language can be switched at runtime in the settings. A missing key in any locale fails the type check, and a test compares keys and placeholders across locales.

## Build

[Rsbuild](https://rsbuild.rs) builds each context as its own environment into `dist/chrome-mv3`:

```
dist/chrome-mv3/
├── manifest.json        Generated from build/manifest.ts, the single reviewed source
├── managed-schema.json  Administrator policy schema (from public/)
├── _locales/            UI and manifest strings
├── pages/               popup.html, options.html, api-client.html and their assets
└── background/          background.js: one self-contained file
```

- The manifest sets a strict CSP for extension pages: `script-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'`.
- In production, the popup and the dashboard also carry `connect-src 'none'`: they cannot reach the network at all.
- Pages contain no inline scripts; bundles contain no `eval` or `new Function`.
- Extension pages are compiled with [React Compiler](https://react.dev/learn/react-compiler), the native Rust port built into Rspack's SWC loader, so components are memoized automatically and need no extra dependency. The linter enforces the Rules of React the compiler relies on; a component that misbehaves can opt out with the `'use no memo'` directive.
- `pnpm dev` writes the build to disk with hot module replacement for extension pages; the HMR client connects to the dev server on `127.0.0.1:3000`. The service worker is rebuilt on change and needs an extension reload.

## Styling

- CSS Modules, built into Rsbuild: each component has a `*.module.css` file next to it, and class names are scoped (`button-a1b2c3`).
- Design tokens are CSS custom properties in `src/shared/ui/tokens.css`; colors follow the system theme through `light-dark()`.
- Global styles (reset and base typography) live in `@layer reset, base` in `src/app/styles/global.css`. Component styles stay unlayered, so they win regardless of the order of CSS in the bundle.
- No CSS-in-JS and no UI component library: no third-party runtime code runs in privileged extension pages, and nothing inserts `<style>` elements at runtime, which keeps a strict `style-src` possible.
- Interactive primitives come from the platform: `Modal` wraps the native `<dialog>`, so the browser traps focus, closes on Esc and restores focus.

## Testing

- **Unit tests** ([Rstest](https://rstest.rs)) sit next to the code in `__tests__/` folders, with shared fixtures in `__tests__/mocks.ts`, and run in Node: validators, business rules, storage adapter, RPC router, migrations, localization.
- **End-to-end tests** (Playwright) load the production build into Playwright's Chromium and check the manifest's permissions, storage access restriction, CSP and real user flows such as switching the interface language or editing rules. Playwright cannot answer the browser's permission prompt, so the Sites tests replace `chrome.permissions.request` and check what would have been requested.
