# Architecture

XRequest is a Manifest V3 extension for Chrome and Edge 140+. This document describes how the code is organized and which rules keep it secure. The rules below are enforced by tooling, not only by convention.

## Execution contexts

| Context                      | Entry point                          | Runs                                                            | Talks to                                                |
| ---------------------------- | ------------------------------------ | --------------------------------------------------------------- | ------------------------------------------------------- |
| Service worker (background)  | `src/app/entrypoints/background.ts`  | On demand; Chrome stops it after ~30 s idle                     | `chrome.storage`, `declarativeNetRequest`, `scripting`  |
| Popup                        | `src/app/entrypoints/popup/`         | While the toolbar popup is open                                 | Storage (read), background (RPC)                        |
| Dashboard (options page)     | `src/app/entrypoints/options/`       | In a tab                                                        | Storage (read), background (RPC), host access requests  |
| API client                   | `src/app/entrypoints/api-client/`    | In a tab                                                        | The network, only for requests the user sends           |
| Interceptor (content script) | `src/app/entrypoints/interceptor.ts` | Main world of pages on sites with mocks on, before page scripts | Only the page: receives mocks through `postMessage`     |
| Bridge (content script)      | `src/app/entrypoints/bridge.ts`      | The extension's isolated world on the same pages                | Background (RPC), the interceptor through `postMessage` |

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

| Store                    | Contents                                                                                             | Notes                                                                                                                 |
| ------------------------ | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `chrome.storage.local`   | `settings`, `rules`, `mocks`, `sites`, `environments`, `environmentChoice`, `vault`, `schemaVersion` | Closed to content scripts: the service worker calls `storage.local.setAccessLevel('TRUSTED_CONTEXTS')` on every start |
| `chrome.storage.session` | `vaultKey`, `vaultStatus` of the unlocked vault                                                      | In memory only; closed to content scripts by default; cleared when the browser closes                                 |
| `chrome.storage.managed` | Administrator policy                                                                                 | Read-only; validated field by field, see below                                                                        |
| IndexedDB                | API client history, open tabs and collections (`xrequest-api-client`)                                | Written by the API client page itself; content scripts cannot reach the extension's IndexedDB                         |

Every value is validated on read and on write with the dependency-free validators in `shared/lib/validation.ts`. Corrupted or foreign data degrades to defaults instead of crashing; invalid data is never written. The layout of `chrome.storage.local` is versioned (`schemaVersion`); migrations run in the service worker before any write.

**Administrator policy fails closed.** If a restricting policy field is present but invalid, it is read in its most restrictive form (for example, a broken `allowedHosts` allows no hosts) and the problem is reported, so an administrator's typo never silently lifts a restriction.

**Without a policy nothing is restricted.** A person who installs the extension alone is their own administrator: every feature works, and only their settings decide. Restrictions come only from a policy that is actually set.

**One reading of the policy for the background and the pages.** `features/policy` decides what the policy lets apply (`isRuleAllowed`, `isMockAllowed`), so the service worker that applies rules and mocks and the dashboard that marks them never disagree. The dashboard's **Organization policy** section shows every field the policy sets, after the fail-closed reading, and its errors; the Rules and Mock API sections name what the policy turns off and mark the records it keeps from applying.

**Records of the policy.** `presetBundle` carries rules and mocks in the export format. Whenever the extension starts or the policy changes, the service worker replaces the policy's records in the stored lists with the ones the bundle brings now: they stand first, so they win, and carry `source: policy` and ids of their own (`policy:<id>`), which a record of the user can never take, through the editor or an import. The background refuses to save or remove them, and the dashboard shows them as coming from the organization, without edit or delete. A broken bundle brings nothing and its errors appear in the policy section; environments are never taken from the policy.

## Messaging

Extension pages read storage directly and react to `chrome.storage.onChanged`. They never write interception settings themselves: they executeRpc the service worker, which is the only writer.

```
page ──RPC (runtime.sendMessage)──▶ service worker ──▶ chrome.storage.local
  ▲                                                          │
  └──────────────────── storage.onChanged ◀──────────────────┘
```

- Envelope: `{ xr: 1, method, params }`, answered with `{ ok: true, result }` or `{ ok: false, error: { code, message } }`.
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

## Mocks

The browser's declarative rules cannot replace a response body, so mocks are served by a script in the page itself. The interceptor runs in the page's main world before any page script and replaces `fetch` and `XMLHttpRequest`. A request that matches a mock gets the mock's status, headers and body after its delay; any other request goes to the browser's own `fetch` or XHR, taken before page scripts ran.

```
service worker ──RPC──▶ bridge (isolated world) ──postMessage──▶ interceptor (main world) ──▶ fetch / XHR of the page
```

- The interceptor imports only `entities/mock` and `shared/lib`, and has no `chrome.*` at all: the linter allows nothing else there.
- Mocks reach the page as `{ xr: 1, mocks }` with only what answering needs: the URL pattern, methods and the response. Names, owners and disabled headers stay in the extension. The interceptor validates every message, since page scripts can post the same shape.
- **Page scripts can read the mocks.** Never put secrets into a mock.
- URL patterns match the way the browser's rules do: the same `||`, `|`, `^` and `*` syntax, case-insensitive (`buildUrlPatternRgx` in `shared/lib`). The first matching mock in the list wins.
- Until the first mock list arrives, requests wait, so a page's first requests are mocked too. Without a list they go to the network after 2 seconds.
- A mocked XHR fires the same events in the same order as a real one, including on abort; `fetch` aborted during the delay rejects with `AbortError`.

Delivery:

- The service worker registers both scripts with `scripting.registerContentScripts` at `document_start` in every frame, on the host patterns of granted sites with mocks on (`sites` in storage, keyed by the pattern the browser granted). It registers nothing while interception is paused, the policy disables mocks or no mock is enabled. It re-checks this whenever mocks, sites, settings, the policy or host access change, and leaves a registration that is already current alone.
- Revoking a site's access keeps its settings: mock scripts and the Sites section follow only the granted patterns, and granting the site again brings its Mocks switch back. Only a full list of sites makes room with the settings of sites without access.
- The bridge asks the service worker for the page's mocks with `mocks/forPage`. Only content scripts may call it, and the site is the sender's origin as the browser reports it: a page of a site without mocks gets an empty list. The bridge posts after this round trip, when the interceptor listens already, whatever order the browser ran the two scripts in.
- Mocks apply when a page loads: a page that is open already gets changes after a reload.

In the dashboard, the Mock API section lists the mocks in priority order with their switches. The editor asks which requests a mock answers (the URL pattern and methods) and what to answer (status, delay, body format, body and headers). The section always warns that page scripts can read mocks. When no site has mocks on, it links to the Sites section, where each granted site has its own Mocks switch.

Known limitations, as with any in-page interception:

- Not intercepted: requests from service workers and web workers of the page, navigations, `<img>`, `<script>` and CSS loads, `sendBeacon`, `WebSocket`, `EventSource`, and requests made before the interceptor was injected.
- Synchronous XHR is never mocked: it cannot wait. `xhr.timeout` does not apply to a mocked response, and `responseType: 'document'` gives `null`.
- A page can detect the replacement: `fetch` and `XMLHttpRequest` are not the native functions, mocked events are not trusted (`isTrusted` is false), and the page's microtasks run after the whole sequence of mocked events rather than between their listeners.

## API client

The API client page builds HTTP requests in tabs and sends them with `fetch` from the extension page. This is the only network access the extension has, and it is used only for requests the user sends.

```
tab ──buildApiRequest──▶ ApiRequest ──buildOutgoingRequest──▶ OutgoingRequest ──fetch──▶ ApiResponse
```

- Each tab keeps one request as typed: the method, the URL, query parameters, headers, the body and the cookie switch. Every body format (JSON, text, form) keeps its own text, so switching formats loses nothing. The open tabs are saved a moment after every change and come back on the next visit, without their responses and with the body of the chosen format only.
- The URL holds the query as typed, and the parameters table mirrors it raw: nothing is decoded or encoded. Typing in the URL rebuilds the table; editing the table rewrites the query of the URL from the switched-on rows, and a switched-off row stays in the table only. A row without a value is written as its key alone (`?debug`). Variables fill the URL as text, so a value with `&` or `#` changes the query, as in Postman.
- Tabs and history saved before version 2 of the database kept the parameters apart and added them at sending. Opening the database at version 2 moves them into the URL once, escaped the way they went (`upgradeRequestQuery`; a store of `defineDatabaseStore` may `upgrade` its records when the version rises).
- `buildOutgoingRequest` in `entities/request` is a pure function. It sends the URL as typed with its query, sets the content type of the body format unless a header sets one, and refuses what `fetch` would throw on, such as a header name with a space or a body on GET. GET and HEAD go without a body; the editor keeps it and says so.
- `fetch` silently drops some headers: `Cookie`, `Origin`, `Referer`, `User-Agent`, `Sec-*` and others. A session rule sets them instead, on that one request (see below), and the editor says so under the headers. Headers the browser builds for every request itself (`Host`, `Content-Length`, `Connection`, `Transfer-Encoding` and the like) stay with it: a rule that changes them breaks the request, so the editor names them as not sent.
- A `fetch` from an extension page sends the site's cookies, even `SameSite=Strict` ones, unless it asks for `credentials: 'omit'`. The client sends `omit` unless the user turns cookies on in the request's settings.
- Requests skip the browser cache (`cache: 'no-store'`) and carry no `Referer` (`referrerPolicy: 'no-referrer'`). The browser still adds `Origin: chrome-extension://<id>` to requests that need one.
- Without host access the browser would hide the response. Send checks the granted host patterns first. If the host is not covered, it asks for `*://<host>/*` within the same click and sends once the user agrees. A refusal leaves a notice with a button that asks again.
- A request still without its whole response after 60 seconds is given up (`API_CLIENT_CONFIG.REQUEST_TIMEOUT_MS`), and the panel says so; a cancel of the user stays a cancel. The page downloads the first 10 MB of a body (`MAX_RESPONSE_BYTES`) and cancels the rest, so a huge response never fills its memory; the panel says when the body was cut.
- The response shows its status, time and size, the body in a read-only editor (JSON laid out, text as it came, binary content not shown) and the headers. Pages never see `Set-Cookie`.

Environments:

- An environment is a named set of variables. A request uses a variable as `{{name}}` in its URL, parameters, headers and body. The environment chosen at the top of the page fills them just before sending, while the tab keeps the templates, so the values of secrets never become part of the request as typed.
- Environments live in `chrome.storage.local` next to rules and mocks, and only the service worker writes them (`environments/save`, `environments/remove`, `environments/choose`). The choice is a key of its own (`environmentChoice`), not a setting, so switching the environment wakes no rule or mock sync. Deleting the chosen environment clears the choice; a choice of an environment that does not exist is refused.
- A request that uses a variable without a value does not go: the response panel names the variables. Switched-off variables are kept but not used.
- Values of secret variables are hidden on the screen. The field is plain text drawn with hidden characters rather than a password field, so the browser's password manager never offers to keep them. Without the vault they are stored unencrypted, and the editor says so.
- Pure parts: `fillVariables`, `getMissingVariables` and `getVariableValues` in `entities/environment`; `mapRequestTexts` and `getRequestTexts` in `entities/request`. The page joins the two entities in `resolveRequestVariables`.

Vault of secrets:

- Optional. Turned on with a master password, it encrypts the value of every secret variable in every environment; other variables stay as typed. The key is 256 bits of PBKDF2-SHA256 over the password with a random 16-byte salt and 600,000 rounds (`VAULT_CONFIG` in `shared/config`, the rounds of each vault are stored with it). Each value is encrypted with AES-GCM under its own random 12-byte nonce and stored as `{ v: 1, iv, ct }`. WebCrypto has no Argon2, so PBKDF2 at the OWASP figure is what works without a dependency.
- The password is stored nowhere. The vault keeps the salt, the rounds and a known text encrypted with the key: unlocking derives the key again and checks that the text opens.
- The key lives in `chrome.storage.session` (memory only, closed to content scripts) while the vault is unlocked, and only the service worker reads it. Pages get the decrypted values of the chosen environment for the requests they send (`vault/reveal`) and never the key. Pages watch `vaultStatus`, which holds only the time of the auto-lock.
- The vault locks itself after 15 minutes without use: unlocking, opening secrets, saving them or sending a request that uses them. Each use moves an `alarms` alarm that wakes the service worker to wipe the key, even with no extension page open; every use of the key also checks the time itself, since an alarm can come late. "Lock secrets" wipes the key at once, and closing the browser clears the session store.
- With the vault on, the service worker encrypts a typed secret value on save and refuses it while the vault is locked. The editor never shows an encrypted value: typing a new one replaces it.
- Changing the master password asks for the current one, derives a key from the new one with a fresh salt and encrypts every secret again. The new key parameters and the environments go to storage in one `set()` call, so a stop halfway cannot leave secrets under a key nobody can derive.
- Turning the vault off asks for the password again and writes the values back unencrypted. A forgotten password leaves only a reset: the encrypted values are deleted, their variables stay, empty.
- A policy with `requireVault` keeps secrets from living unencrypted. While the vault is off, the service worker refuses to store a typed secret value, the client refuses to send a request that uses one already stored, and the editor says why; turning the vault on encrypts those values. The vault cannot be turned off, and a reset after a forgotten password leaves it off until it is set up again.
- A policy that turns the API client off (`disabledFeatures: apiClient`) replaces the page with a notice, takes its button out of the popup and its link out of the dashboard, and the service worker sets no header rules. The history stays in IndexedDB.
- What the vault does not protect against: anyone who can run code in the extension's pages or service worker while it is unlocked, and guessing a weak password from a copy of the browser profile. A strong password is the only defence against the latter.

History:

- Every request that went out, with a response or without one, goes to the history; a cancelled one does not. An entry keeps the request as typed, with `{{variables}}` and without their values, plus the status, time and size of the response. Response bodies are not kept.
- The history keeps the last 100 requests (`API_CLIENT_CONFIG.HISTORY_LIMIT` in `shared/config`); a new entry drops the oldest ones in the same step. A request from the history opens as a copy in a new tab.
- The history and the open tabs live in IndexedDB, not in `chrome.storage.local`: bodies can be large and must never take space from rules, and a write there wakes no service worker. The page writes them itself through `shared/platform/database/database.ts`, a small adapter without a library. Like `chrome.storage`, it validates every record on read and on write and skips a broken record.
- A page that changes the records tells the other pages of the extension through a `BroadcastChannel`, so two open API client pages show the same history. The open tabs are one record: two pages open at once overwrite each other's tabs.

cURL import:

- "Import cURL" in the header takes a command, for example from the browser's "Copy as cURL (bash)", and opens it in a new tab. `parseCurl` in `entities/request`, a pure function, reads the method, the URL, query parameters, headers and the body. It follows bash quoting (`'…'`, `"…"`, `$'…'`, `\` and line breaks); cmd and PowerShell syntax is not supported.
- What it cannot import faithfully, such as multipart forms and file uploads (`-F`, `-T`), is refused with a reason, and the dialog stays open. Options that change nothing for the API client, such as `--compressed` or `-o`, are skipped.
- Cookies of the command (`-b` or a `Cookie` header) arrive as a header, and the cookie switch stays off. A session rule sends them, like any header `fetch` drops.

cURL export:

- "Copy as cURL" next to Send, and on every history entry, writes the request as a bash command in the same shape the browser's developer tools use, so the import reads it back to the same request. `buildCurlCommand` in `entities/request` is a pure function: the method only where curl would not infer it, the enabled headers as typed, the type of the body unless a header names it, and the body as `--data-raw`.
- Variables of the chosen environment are filled in, secrets only when the user ticks "Fill in secrets", and a typed secret never while the policy requires the vault. Names left without a value are listed under the command. The browser's cookies never go into the command.
- The command is copied with `navigator.clipboard.writeText` at the user's click, which extension pages may do without the `clipboardWrite` permission.

Collections:

- A collection keeps requests in folders, up to 5 levels deep; there can be up to 100 collections of up to 2000 requests each. Each collection is one record of IndexedDB (a store of its own since version 3 of the database), checked by the same kind of validator as everything else.
- A tab opened from a collection remembers which request it came from and shows its name, renamed along with it. Save (the icon next to Send, or Ctrl+S) writes the tab back to that request, and a dot on the tab marks changes not saved yet. A tab without a collection, or whose request was deleted, asks where to save: a collection or a new one, and a folder.
- The tree in the sidebar opens and closes collections and folders; a menu on each row adds a folder or a request, renames, and deletes after a confirmation. Deleting closes no tab: the request stays open until saved elsewhere or closed.
- The tree operations are pure functions in `entities/request`. The menu is a native popover anchored to its button, so nothing inserts styles at run time.

Import of Postman and OpenAPI files:

- "Import" in the Collections panel takes a Postman collection of the formats v2.0 and v2.1 or a Postman environment, or an OpenAPI 3.0 or 3.1 description, as JSON, up to 10 MB; the dialog tells the formats apart by themselves. YAML and Swagger 2.0 are refused with a hint to convert the file. A preview says what will be created and lists what cannot be carried over before anything is written.
- The file is read as data: fields of any other type or shape are skipped, and what comes out passes the same validators as the collections and environments the user makes. Pre-request scripts and tests are counted and never taken, so no code from a file ever runs.
- Folders, requests, headers, the query (switched-off parameters stay in the table only), raw JSON, text and URL-encoded bodies are carried over. Path variables such as `:id` take the value the file gives them. Authorization of the request, its nearest folder or the collection becomes a header: a bearer token, an API key (or a query parameter), or basic credentials without `{{variables}}` (the header holds them encoded, so a variable inside could never be filled). Multipart forms, files, GraphQL, other kinds of authorization, saved example responses and Postman's generated values such as `{{$guid}}` are listed as not carried over; folders deeper than five levels give their requests to the fifth.
- Variables of a collection become a new environment, "<collection>: variables". Secret values follow the rules of typing them in the editor: stored as typed while the vault is off, encrypted while it is unlocked, and left empty while it is locked or while the policy requires the vault and it is off.
- Each import makes a new collection and a new environment with ids of their own; importing a file again makes copies.
- An OpenAPI description becomes a collection named after its title. Each operation is a request named after its summary or operationId, in the folder of its first tag (tags keep the order the description lists them; an operation without a tag stays at the top). The URL is `{{baseUrl}}` and the path with `{name}` turned into `{{name}}`; the first server, with its variables at their defaults, becomes `baseUrl` in a new environment.
- Parameters of the path and of the operation join, the operation's winning by place and name. Required query and header parameters are switched on, optional ones wait in the table; their values come from the examples, the default or the first choice of the description, with `%`, `&`, `#` and `+` escaped, since the description means the value itself. `Accept`, `Content-Type` and `Authorization` parameters are ignored, as the specification asks.
- A JSON body takes the example of the media type, or a value built from its schema: references inside the file are followed, `allOf` joins its parts, `oneOf` and `anyOf` take the first, schemas nest at most eight levels, a reference already being built gives null, and one example takes at most 200 values, so a description the size of GitHub or Stripe never hangs the page. URL-encoded forms and text are carried over too; multipart and binary bodies are listed as not carried over.
- Security of the operation, or of the description, becomes a header or a query parameter with `{{token}}`: a bearer token for bearer, OAuth 2.0 and OpenID Connect, `Basic {{token}}` for basic credentials (the token then holds `user:password` in Base64), and the key for an API key. With several schemes each token is named after its scheme. The tokens wait in the environment as empty secrets, and the preview asks to fill them in. API keys in cookies, cookie parameters, other HTTP schemes, mutual TLS, references to other files, TRACE operations, servers of a single path or operation and a server address that is not a full URL are listed. Keys of `paths` that are extensions (`x-…`) are skipped.

Headers through a session rule:

- Before sending such a request, the page asks the service worker for a session rule (`headerRules/apply`) and releases it once the request is over (`headerRules/release`). The rule sets the headers only on requests started by the extension itself (`initiatorDomains` is its id), from the tab of that page (`tabIds`, the tab the browser reports for the sender) and to the host of the request (`requestDomains`), so browsing and other tabs are never touched. Its priority is above every rule of the user, so the typed headers win.
- A rule cannot tell two requests of one tab to one host apart, so the page sends requests that need a rule one at a time; requests without such headers do not wait. A rule left behind by a cut-off send is replaced by the next one of that tab, and session rules are gone when the browser closes.
- Repeated headers are joined the way HTTP joins them: values with `, `, cookies with `; `. A typed `Cookie` header replaces the site's cookies even when the cookie switch is on.
- The browser itself checks access to the host of the request, as for any rule of the extension.

## Import and export

People share rules, mocks, environments and collections as a JSON file that is easy to keep in git. The same format carries the administrator's `presetBundle`, which brings rules and mocks only.

```json
{
    "format": "xrequest",
    "version": 2,
    "exportedAt": "2026-10-25T12:00:00.000Z",
    "rules": [],
    "mocks": [],
    "environments": [],
    "collections": []
}
```

- Records keep the shape of storage and pass the same validators, limits and checks for unique ids. The file has no `source`: what it brings is the user's own. The schema is strict, a file of a newer version is refused, a file of version 1 (without collections) is read as it is, and a file may be up to 5 MB.
- An export carries the chosen lists without the records of the policy and without the values of secrets: a secret variable keeps its name, empty. Keys of records are sorted and the file uses Prettier's indent, so a diff in git shows only real changes. The page saves the file through a link it downloads itself, so the extension needs no `downloads` permission.
- An import merges by id: a new id joins the end of its list, a known id replaces the record in place, a record of the policy stays as it is, and nothing is deleted. An empty secret of the file keeps the value this browser has for it. The page shows what the import will do before it writes anything.
- The service worker parses the text again, checks the merged lists with the same limits and regex checks as a single save (`transfer/import`), and writes rules, mocks and environments in one `chrome.storage.local.set()` call, then the collections to IndexedDB in one transaction. The two writes are not atomic together; a stop between them leaves the collections out, and importing the file again adds them. A broken file changes nothing, and the reasons come with their paths, such as `$.rules[3].match.url`.
- The code is the first shared feature beyond the interception switch: `features/transfer` holds the format and the merge, which both the dashboard and the service worker use.

## Site access

Host access is the user's decision, made one site at a time:

- The dashboard's Sites section asks the browser for `*://<domain>/*`, or for `*://*.<domain>/*` with subdomains, which also covers the domain itself. Both cover any port. The browser shows its own prompt, and only inside the user's click.
- The list shows what the browser has actually granted (`permissions.getAll`) and reloads on `permissions.onAdded` and `onRemoved`. There is no copy in storage that could drift from it.
- Removing a site revokes the permission, and rules stop working there at once.
- A policy with `allowedHosts` narrows this choice. `example.com` allows the host alone and `*.example.com` allows it with every subdomain; the scheme and the port never matter, and an empty list allows no host. The Sites section, a rule's **Allow** button and the API client never ask for a host outside the list, and the API client does not send there. The service worker takes away access outside the list whenever the policy changes, the extension starts or access is granted, including through the browser's own menu, and it registers no mock scripts and sets no header rules for such hosts.

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
├── background/          background.js: one self-contained file
└── content/             interceptor.js and bridge.js: self-contained files for web pages, without eval
```

- The manifest sets a strict CSP for extension pages: `script-src 'self'; style-src 'self'; img-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'`. No inline script or style runs and no image loads from elsewhere; the end-to-end tests compare the whole policy. In `pnpm dev`, Rsbuild's error overlay loses its styles under it.
- In production, the popup and the dashboard also carry `connect-src 'none'`: they cannot reach the network at all.
- Pages contain no inline scripts; bundles contain no `eval` or `new Function`.
- Extension pages are compiled with [React Compiler](https://react.dev/learn/react-compiler), the native Rust port built into Rspack's SWC loader, so components are memoized automatically and need no extra dependency. The linter enforces the Rules of React the compiler relies on; a component that misbehaves can opt out with the `'use no memo'` directive.
- `pnpm dev` writes the build to disk with hot module replacement for extension pages; the HMR client connects to the dev server on `127.0.0.1:3000`. The service worker is rebuilt on change and needs an extension reload.

## Styling

- CSS Modules, built into Rsbuild: each component has a `*.module.css` file next to it, and class names are scoped (`button-a1b2c3`).
- Design tokens are CSS custom properties in `src/shared/ui/tokens.css`; colors follow the system theme through `light-dark()`.
- The palette stays black, gray and white, and color carries meaning only: a blue accent marks what is on or chosen (switches, chips, checkboxes, focus, the chosen environment, info notices), HTTP methods take the colors Postman uses, statuses go green, blue, orange and red by their hundreds, `{{variables}}` stand out in orange in the fields and the body editor, and JSON keys, strings, numbers and literals have the colors of common code editors. Warnings and errors keep their own colors.
- Global styles (reset and base typography) live in `@layer reset, base` in `src/app/styles/global.css`. Component styles stay unlayered, so they win regardless of the order of CSS in the bundle.
- No CSS-in-JS and no UI component library: no third-party runtime code runs in privileged extension pages, and nothing inserts `<style>` elements at runtime, which keeps a strict `style-src` possible.
- Interactive primitives come from the platform: `Modal` wraps the native `<dialog>`, so the browser traps focus, closes on Esc and restores focus. `Menu` and `InfoTip` are popovers placed by CSS anchor positioning, and `FileDropzone` lets the native file field take clicks and dropped files. `TemplateInput` colors `{{variables}}` with a copy of the text drawn under a field whose own text is transparent.
- The code editor (`CodeEditor`, [CodeMirror 6](https://codemirror.net)) is the one third-party UI library. CodeMirror styles itself at runtime, so it runs inside a shadow root of its host: there its styles go to a constructable stylesheet (`adoptedStyleSheets`), which `style-src 'self'` allows, instead of a `<style>` element, which it blocks. Its theme uses the same tokens as the rest of the page, since custom properties reach into the shadow root. Lint markers that CodeMirror draws as `data:` images are restyled, because `img-src 'self'` blocks them. The editor loads in its own chunk when it is first shown.
- Two details keep the editor exact under that policy. A JSON error is placed where the syntax tree stops, since `JSON.parse` does not name a position for every error. Text that spans lines, typed over several selected lines or inserted with line breaks, goes in through the editor rather than the browser's own editing, which would try to add inline styles.

## Testing

- **Unit tests** ([Rstest](https://rstest.rs)) sit next to the code in `__tests__/` folders, with shared fixtures in `__tests__/mocks.ts`, and run in Node: validators, business rules, storage adapter, RPC router, migrations, localization.
- **End-to-end tests** (Playwright) load the production build into Playwright's Chromium and check the manifest's permissions, storage access restriction, CSP and real user flows such as switching the interface language or editing rules. Playwright cannot answer the browser's permission prompt, so the Sites tests replace `chrome.permissions.request` and check what would have been requested.
- **Interception tests** (`e2e/interception.spec.ts`) check the effect of rules on real requests. A local HTTP server (`e2e/testServer.ts`, Node's `node:http` on `127.0.0.1` with a random port) serves a test page and echoes every other request back with the headers it received. The tests load a copy of the build with install-time access to `http://127.0.0.1/*`, so the shipped manifest stays unchanged. They cover a block rule on fetches and navigations, redirects to a URL, a regex substitution and a URL transform, and request and response header changes. The browser maps a second host, `foreign.test`, to the same server, but the extension has no access to it. A request from a page on that host passes even when a rule blocks its URL: a rule acts only when the extension has access to both the request URL and the page that started it.
- **Interceptor tests** (`e2e/interceptor.spec.ts`) inject the built `content/interceptor.js` into the test page before its scripts, post a mock list the way the bridge does, and check `fetch` and XHR in the real browser. A mocked XHR is compared with a real request to the test server, so its events must match the browser's own.
- **Mock delivery tests** (`e2e/mocks.spec.ts`) go through the real registration: they turn mocks on for the test server's granted pattern, save a mock and wait until the browser has both scripts. A page of the site then gets the mock, including a request its own script sends while the page is still parsing; a page of a site without mocks reaches the server. They also check that switching mocks off or pausing interception takes the scripts away, and that the background refuses page mocks to extension pages, mocks for sites it has not granted, and mocks that claim to come from the policy. The dashboard tests do the same through the interface: they turn mocks on in Sites, create a mock in the editor and load a page of the site.
- **Policy tests** (`e2e/policy.spec.ts`) cannot set a real policy: only the operating system fills `chrome.storage.managed`. Their copy of the build runs a stand-in first, at the top of the service worker and in every page, that reads the policy from `storage.session` and reports its changes as changes of the managed area. The tests check the policy section and its errors, the marks in the Rules and Mock API sections, the background's rules following a change of the policy, and the records of a policy bundle: first in their lists, applied by the browser, out of reach of the user, gone with the policy or with a broken bundle. The stand-in skips the browser's own check against the schema, so the tests use only values that pass it.
- **API client tests** (`e2e/apiClient.spec.ts`) send requests from the page to the test server: parameters and headers, a JSON body, cookies off and on, a host without access, where the access prompt is replaced as in the Sites tests, variables of an environment created in the editor, headers through a session rule, the vault (encrypted storage, a wrong password, lock and auto-lock through the alarm, a new password, turning off and reset), a response past the size limit, the query of the URL mirrored in the table and the one-time move of old parameters into the URL, the cURL import, the cURL export with and without secrets read back by the import, and the history with its limit and the open tabs after a reload. The server keeps what reached it (`getLastRequest`), and the tests check it there: the response editor draws only the lines on the screen.
- **Type checking** runs two programs. `tsconfig.json` covers the whole repository with Node typings for configs, unit tests and e2e. `tsconfig.browser.json` covers `src` without tests and without Node typings, so extension code cannot use Node APIs by accident.
