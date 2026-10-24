# Permissions

Every permission InterceptKit requests is listed here with the reason it needs it. A change to the permissions in [`build/manifest.ts`](../build/manifest.ts) must update this file in the same change. The end-to-end tests assert the exact list, so an unreviewed permission fails the build.

## Requested at install

| Permission                            | Warning shown to the user | Why it is needed                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `storage`                             | None                      | Keeps rules, mocks, sites and settings in `chrome.storage.local`, short-lived state in `chrome.storage.session`, and reads administrator policy from `chrome.storage.managed`.                                                                                                                                                                                       |
| `declarativeNetRequestWithHostAccess` | None                      | Redirects, modifies headers of and blocks requests through declarative rules the browser applies itself. Rules take effect only on sites you granted access to. The API client also uses it for headers `fetch` cannot set, such as `Cookie` or `User-Agent`: a session rule limited to the extension's own request from that tab, removed once the request is over. |
| `scripting`                           | None                      | Registers the two mock scripts on the sites where you turned mocks on: `content/interceptor.js` in the page's own world answers `fetch` and XHR with your mocks, `content/bridge.js` in the extension's isolated world hands it the mocks of that site. Nothing is registered while no granted site has mocks on.                                                    |
| `alarms`                              | None                      | Locks the vault of secrets after 15 minutes without use. The browser wakes the background at that time, and it wipes the key from `chrome.storage.session` even when no extension page is open. One alarm, set only while the vault is unlocked.                                                                                                                     |

## Host access

None at install. `optional_host_permissions: *://*/*` only declares which sites the extension _may ask for_. You add each site in the dashboard's Sites section, where the browser asks for your approval in its own prompt, and you can remove it there at any time. Until then the extension cannot see or change that site.

The API client asks the same way when you send a request to a host it has no access to: the browser prompts for `*://<host>/*` at your click on Send. Without that access the browser would hide the response from the extension.

The browser checks host access both for the request and for the page that started it: a rule for `api.example.com` on requests from `app.example.com` works only after both sites are granted.

## Planned

Each permission is added only in the version that starts using it. None is planned at the moment.

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
