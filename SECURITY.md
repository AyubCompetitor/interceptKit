# Security policy

InterceptKit changes requests in your browser, mocks responses and keeps API tokens, so its security is the product. This page says how to report a problem and what the extension does to stay safe.

## Reporting a vulnerability

Please report a vulnerability privately, not in a public issue:

1. Open the repository's **Security** tab and choose **Report a vulnerability** ([direct link](https://github.com/AyubCompetitor/interceptKit/security/advisories/new)).
2. Describe what an attacker can do, the steps to reproduce it, the browser and its version, and the version of InterceptKit.

Reports are handled as coordinated disclosure: the fix ships first, and the advisory is published with credit to the reporter unless they ask otherwise.

## Supported versions

The project is in early development (version 0.x). Only the latest released version gets security fixes.

## In scope

- Anything that lets a website, another extension or an import file read or change what InterceptKit keeps: rules, mocks, environments, secrets, history.
- Anything that makes the extension send a request the user did not start, or reach a site the user did not grant.
- Ways around the master-password vault, the strict Content Security Policy of the extension pages, or the administrator's policy.

## Out of scope

- An attacker who already controls the operating system, the browser or the user's unlocked browser profile.
- What a page can see of its own mocks: scripts of the page can read the mocks it receives, and the dashboard warns not to put secrets into them.
- The detection of the mock interceptor by the page, and the requests it cannot intercept (see [Mocks](docs/ARCHITECTURE.md#mocks)).

## How InterceptKit protects you

- **No servers, no traffic of its own.** No backend, accounts, telemetry or analytics. The only requests the extension sends are the ones you send in the API client. The popup and the dashboard cannot open network connections at all (`connect-src 'none'`).
- **No remote code.** Every script ships in the package. No `eval`, `new Function` or `unsafe-eval`; extension pages run under `script-src 'self'; style-src 'self'; img-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'`.
- **Minimal permissions.** No host access at install: you grant each site yourself, and the browser checks access both for the request and for the page that sent it. Every permission is explained in [docs/PERMISSIONS.md](docs/PERMISSIONS.md).
- **Local data.** Everything lives in `chrome.storage` and IndexedDB, closed to content scripts. Sharing goes through JSON files you export and import yourself.
- **Encrypted secrets, as an option.** Secret variables of the API client can be encrypted with a master password (PBKDF2-SHA256 with 600,000 rounds, AES-GCM-256). Without it, secrets are stored unencrypted, and the editor says so.
- **Few, reviewed dependencies.** The lockfile is committed, new versions are installed only after 7 days, and install scripts of dependencies are blocked.

The full analysis of what can go wrong and what stops it is in [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md). Administrators find the policies and their limits in [docs/ENTERPRISE.md](docs/ENTERPRISE.md).
