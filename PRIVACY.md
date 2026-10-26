# Privacy policy

_Last updated: 2026-10-24_

XRequest is a browser extension for web developers and testers. It has no server, no accounts and no analytics, and it does not collect, sell or share any data about you.

## What the extension keeps

Everything you create stays in your browser profile on your device:

- rules, mocks, the list of sites you allowed, and settings, in `chrome.storage.local`;
- environments of the API client with their variables, in `chrome.storage.local`. Secret values are encrypted with your master password if you turn the vault on; otherwise they are stored unencrypted, and the editor says so;
- the last 100 requests of the API client and its open tabs, in the extension's IndexedDB. A request is kept as you typed it, with `{{variables}}` rather than their values, and without the response body.

None of it is sent to the developer or to anyone else. It leaves your device only in a JSON file you export yourself, and an export never carries the values of secrets.

## What the extension sends

- **Nothing on its own.** No telemetry, crash reports, update checks or calls to any service of the developer.
- **The requests you send in the API client**, to the address you type, with the headers and body you set. Your cookies for that site go only when you turn that on for the request.

Rules and mocks change requests inside your browser and only on sites you allowed. Mocks are handed to the pages of those sites, so scripts of those pages can read them: do not put secrets into mocks.

## Your organization

If your organization manages your browser, its administrator can set a policy for XRequest, for example to limit the sites it works on. The policy comes from your browser and is shown in the dashboard's **Organization policy** section; the extension sends nothing back.

## Removing your data

Uninstalling the extension deletes everything it kept. You can also delete rules, mocks, sites, environments and the history in the extension itself at any time.

## Contact

Questions about this policy go to the issues of the project: <https://github.com/AyubCompetitor/xrequest/issues>. Security problems are reported privately, as [SECURITY.md](SECURITY.md) describes.
