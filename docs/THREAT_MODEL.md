# Threat model

What InterceptKit protects, from whom, and what is left to the browser, the operating system and the administrator. How each part works is in [ARCHITECTURE.md](ARCHITECTURE.md); how to report a problem is in [SECURITY.md](../SECURITY.md).

## What is worth protecting

| Asset                         | Where it lives                                                   | Why it matters                                                          |
| ----------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Secrets of environments       | `chrome.storage.local`, encrypted when the vault is on           | API tokens and passwords of the user's services                         |
| The vault key                 | `chrome.storage.session`, only while unlocked                    | Opens every encrypted secret                                            |
| Rules, mocks, sites, settings | `chrome.storage.local`                                           | Decide what happens to the user's traffic                               |
| API client history and tabs   | IndexedDB of the extension                                       | Requests as typed, with `{{variables}}` and without the values of them  |
| The user's cookies            | The browser                                                      | The API client can send them to a site, so it must not do so by default |
| The administrator's policy    | `chrome.storage.managed`, set by the operating system's policies | Restricts what the extension may do in an organization                  |

## Who might attack

- **A website** the user visits, including one on a site the user granted to InterceptKit.
- **A file** the user imports, or a policy bundle, written by someone else.
- **Another extension** in the same browser.
- **A user who wants around the policy** of their organization.
- **Someone with the user's disk or browser profile**, but without the master password.
- **A compromised dependency** of the build.

## Trust boundaries

```
web page (main world) ──postMessage──▶ interceptor        no chrome.* API, sees only what the bridge posts
        │
content scripts (isolated world) ──RPC──▶ service worker   the browser names the sender's origin
        │
extension pages ──RPC──▶ service worker ──▶ chrome.storage, declarativeNetRequest, scripting
        │
API client page ──fetch──▶ the network                      only the requests the user sends
operating system policy ──▶ chrome.storage.managed           read-only for the extension
```

The service worker is the only writer of storage. It checks every message against a schema, accepts only senders of this extension, and lets each method declare who may call it: extension pages, or content scripts too.

## Threats and what stops them

### A website

- **Reading what the extension keeps.** `chrome.storage.local` is closed to content scripts (`setAccessLevel('TRUSTED_CONTEXTS')`, Chrome 140+), and `storage.session` is closed by default. A page never talks to the service worker. Its bridge, a content script, asks only for the mocks of the page's own origin, and the background takes that origin from the browser, not from the message.
- **Reading its mocks.** Scripts of a page can read every mock it receives: the interceptor runs in the page's own world. The bridge passes only what a mock needs (its match and response, with enabled headers), only on sites where the user turned mocks on. The dashboard warns that mocks are no place for secrets.
- **Feeding the interceptor fake mocks.** The interceptor accepts lists posted from its own window, so scripts of the page can post one too. That only changes the page's own requests, which the page controls anyway.
- **Being changed without the user's consent.** Rules and mock scripts act only on sites the user granted. The browser also checks the page that started a request: a rule for an API does nothing on pages of a site without access.

### The extension itself

- **Sending data anywhere.** There is no backend, telemetry or analytics, and no code checks for updates or reports errors. The popup and the dashboard run under `connect-src 'none'`. The only page that may connect is the API client, and it sends only what the user sends, to hosts the user grants at the click on Send.
- **Running code that did not ship.** Extension pages run under `script-src 'self'` with no `eval`, `new Function` or `unsafe-eval`; the linter forbids them in the code, and the end-to-end tests compare the whole policy of the manifest. The code editor mounts in a shadow root so its styles never need an exception in the policy.
- **Leaking cookies.** The API client sends no cookies unless the user turns that on for the request (`credentials: 'omit'` by default).
- **Changing other traffic for the API client.** Headers that `fetch` cannot set go through a session rule limited to the extension's own request, from that tab, to that host, and removed when the request is over.

### Secrets at rest

- **Someone reads the browser profile.** Without the vault, secrets are stored unencrypted, like everything else in the profile; the editor says so. With the vault, each secret is encrypted with AES-GCM-256 under a key derived from the master password with PBKDF2-SHA256 and 600,000 rounds. The password is stored nowhere.
- **Someone uses an unlocked browser.** The key stays in memory only while the vault is unlocked, the vault locks itself after 15 minutes without use, even with no extension page open, and "Lock secrets" wipes the key at once. Turning the vault off or changing the password asks for the password again.
- **Secrets end up in the history.** The history keeps a request as typed, with `{{variables}}` rather than their values, and never keeps a response body.
- **Secrets end up in an export.** An export carries the names of secret variables with empty values.

### Files and policy bundles

- **A crafted file.** An import is parsed as data with a strict schema: every record goes through the same validators as the storage, an unknown field is an error, and a file over 5 MB is refused before it is read. Nothing in a file runs. Postman and OpenAPI files are read leniently, since other tools wrote them, but what comes out passes the same validators; scripts and tests of Postman are never taken, an OpenAPI description follows only references inside itself, and nesting too deep is refused instead of crashing the page.
- **A file that takes the place of the administrator's records.** Records of the policy have ids of their own (`policy:<id>`), which no record of the user can take, through an import or the editor, and the background refuses to save or remove them.

### A user and the organization's policy

- **Lifting a restriction with a typo.** The extension reads the policy fail-closed: a restricting field that is present but invalid is read in its strictest form, and the error is shown.
- **Granting a site outside `allowedHosts`.** The service worker takes away access outside the list whenever access is granted, including through the browser's own menu.
- **Turning off required encryption.** With `requireVault`, the background refuses to store typed secrets, the API client refuses to send ones stored before, and the vault cannot be turned off.

### The build

- **A malicious dependency.** Few dependencies, each agreed on before it is added; a committed lockfile; new versions are installed only after 7 days; install scripts of dependencies are blocked.

## What is left

- **The policy is enforced by the extension.** A user with DevTools on the extension's own pages can run code there, for example a `fetch` from the API client page. Organizations that need a hard line should also restrict DevTools and use the browser's own site restrictions (see [ENTERPRISE.md](ENTERPRISE.md#browser-controls-to-add)).
- **Values the browser drops.** The browser publishes no policy value that fails the extension's schema, so a list given as a single string never reaches the extension, and its restriction does not apply. Administrators should check the values in the dashboard's policy section.
- **Mocks are visible and detectable.** A page can read its mocks and can notice that `fetch` was replaced. Requests from workers, navigations, `<img>`, `<script>`, CSS, `sendBeacon`, `WebSocket` and `EventSource` are not mocked.
- **PBKDF2, not Argon2.** WebCrypto has no memory-hard function, so a weak master password is the weak point of the vault.
- **Data in the profile.** Rules, mocks, the history and, without the vault, secrets are as safe as the browser profile and the disk under it.

## Out of scope

- A compromised operating system, browser or user account, and malware on the machine.
- An administrator of the machine, who can change the policy itself.
- The sites the user chooses to send requests to with the API client.
