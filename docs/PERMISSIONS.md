# Permissions

Every permission InterceptKit requests is listed here with the reason it needs it. A change to the permissions in [`build/manifest.ts`](../build/manifest.ts) must update this file in the same change. The end-to-end tests assert the exact list, so an unreviewed permission fails the build.

## Requested at install

| Permission | Warning shown to the user | Why it is needed                                                                                                                                                               |
| ---------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `storage`  | None                      | Keeps rules, mocks, sites and settings in `chrome.storage.local`, short-lived state in `chrome.storage.session`, and reads administrator policy from `chrome.storage.managed`. |

## Host access

None at install. The extension cannot see or change any website until you enable it for that site.

## Planned

Each permission is added only in the version that starts using it.

| Permission                            | Warning         | Why it will be needed                                                                                                      |
| ------------------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `declarativeNetRequestWithHostAccess` | None            | Redirect, modify headers and block requests, only on sites you granted access to.                                          |
| `optional_host_permissions: *://*/*`  | None at install | Declares which sites the extension _may ask for_. Nothing is granted at install; you approve each site when you enable it. |
| `scripting`                           | None            | Registers the mock scripts on the sites where you turned mocks on.                                                         |

## Deliberately not requested

| Permission                                     | Why not                                                                                                       |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `<all_urls>` or any host permission at install | Access is granted per site at runtime instead.                                                                |
| `declarativeNetRequest` (without host access)  | Would show "Block content on any page" and work on every site without your approval.                          |
| `declarativeNetRequestFeedback`                | Shows "Read your browsing history"; only useful for debugging unpacked builds.                                |
| `webRequest`, `webRequestBlocking`             | Declarative rules cover redirects, headers and blocking without reading your traffic.                         |
| `tabs`                                         | Opening the extension's own pages with `chrome.tabs.create` needs no permission.                              |
| `cookies`, `history`, `bookmarks`, `downloads` | Not needed for any feature.                                                                                   |
| `unlimitedStorage`                             | `chrome.storage.local` holds 10 MB, enough for rules and mocks; large API client data will live in IndexedDB. |
