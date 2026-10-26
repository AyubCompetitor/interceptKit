# Store listing

Everything the Chrome Web Store and Microsoft Edge Add-ons dashboards ask for, ready to paste. Both stores take the same package.

## Release steps

1. Raise `version` in `package.json`: each upload needs a larger number than the last one.
2. Run `pnpm check`.
3. Run `pnpm release`. It writes `dist/xrequest-<version>.zip` and prints its SHA-256. The archive has fixed dates and a fixed file order, so two builds of the same commit with the same tools give the same bytes: put the hash into the release notes.
4. If the interface changed, run `pnpm store:screenshots` and `pnpm icons`.
5. Upload the archive and fill in the fields below.

Chrome reviews most items within a few days, sometimes a few weeks; Edge certifies within seven business days.

## Listing

| Field          | Value                                                             |
| -------------- | ----------------------------------------------------------------- |
| Name           | XRequest (from the manifest)                                      |
| Summary        | The manifest's `description`, in English and Russian              |
| Category       | Developer Tools                                                   |
| Languages      | English, Russian                                                  |
| Homepage       | <https://github.com/AyubCompetitor/xrequest>                      |
| Support        | <https://github.com/AyubCompetitor/xrequest/issues>               |
| Privacy policy | <https://github.com/AyubCompetitor/xrequest/blob/main/PRIVACY.md> |

### Description in English

```text
XRequest puts the tools for working with HTTP requests into one open-source extension, and keeps everything in your browser.

• Rules: redirect requests to another URL or host, change the headers of requests and responses, block requests. The browser applies the rules itself, and only on sites you allow.
• Mock API: answer the fetch and XHR requests of a page with your own status, headers, body and delay, with no backend.
• API client: send requests with parameters, headers and a JSON, form or raw body; keep them in collections with folders; switch environments with {{variables}}; keep the history; paste a command from "Copy as cURL" and copy a request back as one; import Postman collections and environments and OpenAPI descriptions.
• Secrets: encrypt API tokens with a master password (AES-GCM, PBKDF2 with 600,000 rounds).
• Sharing: export rules, mocks, environments and collections as a JSON file that is easy to keep in git, and import it in another browser.
• For organizations: administrators can limit sites and features, require encryption and hand out rules through the browser's policy.

Private by design:
• no servers, accounts, telemetry or analytics;
• no remote code, and a strict Content Security Policy;
• no access to any site until you allow it;
• open source under the MIT license: https://github.com/AyubCompetitor/xrequest
```

### Description in Russian

```text
XRequest собирает инструменты для работы с HTTP-запросами в одном открытом расширении и хранит всё у вас в браузере.

• Правила: перенаправляйте запросы на другой адрес или хост, меняйте заголовки запросов и ответов, блокируйте запросы. Правила применяет сам браузер, и только на сайтах, которые вы разрешили.
• Моки API: отвечайте на fetch- и XHR-запросы страницы своим статусом, заголовками, телом и задержкой — без бэкенда.
• API-клиент: отправляйте запросы с параметрами, заголовками и телом в JSON, в виде формы или произвольным текстом; складывайте их в коллекции с папками; переключайте окружения с {{переменными}}; храните историю; вставляйте команду из «Copy as cURL» и копируйте запрос такой же командой; импортируйте коллекции и окружения Postman и описания OpenAPI.
• Секреты: шифруйте API-токены мастер-паролем (AES-GCM, PBKDF2 с 600 000 итераций).
• Обмен: выгружайте правила, моки, окружения и коллекции в JSON-файл, который удобно хранить в git, и загружайте его в другом браузере.
• Для организаций: администратор через политику браузера ограничивает сайты и функции, требует шифровать секреты и раздаёт правила.

Конфиденциальность с самого начала:
• без серверов, аккаунтов, телеметрии и аналитики;
• без удалённого кода, со строгой политикой безопасности содержимого;
• без доступа к сайтам, пока вы его не дадите;
• открытый код под лицензией MIT: https://github.com/AyubCompetitor/xrequest
```

## Images

| Image                   | File                                                                               | Store        |
| ----------------------- | ---------------------------------------------------------------------------------- | ------------ |
| Icon, 128 × 128         | `public/icons/icon-128.png`, inside the package                                    | Chrome, Edge |
| Logo, 300 × 300         | `store/images/edge-logo.png`                                                       | Edge         |
| Screenshots, 1280 × 800 | `store/screenshots/en/*.png`, `store/screenshots/ru/*.png` for the Russian listing | Chrome, Edge |

Promo tiles (440 × 280, 1400 × 560) are optional in both stores and not made yet.

## Privacy practices

### Single purpose

```text
A developer tool for HTTP requests: it changes, blocks and mocks the requests of sites the user allows, and sends the requests the user writes to test an API.
```

### Permissions

| Permission                             | Justification                                                                                                                                                                                                                                      |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `storage`                              | Keeps the user's rules, mocks, sites, environments and settings in chrome.storage.local, the key of the unlocked vault in chrome.storage.session, and reads the administrator's policy from chrome.storage.managed. Nothing is sent anywhere.      |
| `declarativeNetRequestWithHostAccess`  | Applies the user's redirect, header and block rules as declarative rules, only on sites the user granted. The API client also sets headers that fetch cannot set, such as Cookie or User-Agent, through a session rule limited to its own request. |
| `scripting`                            | Registers the two mock scripts only on sites where the user turned mocks on, so that the fetch and XHR requests of those pages get the user's mocks.                                                                                               |
| `alarms`                               | Locks the vault of secrets after 15 minutes without use, even when no page of the extension is open.                                                                                                                                               |
| Host permissions (`*://*/*`, optional) | None at install. The user grants each site in the dashboard, or when sending an API client request to it; rules and mocks work only on granted sites.                                                                                              |

### Remote code

`No, I am not using remote code.` Every script ships in the package, and the extension pages run under `script-src 'self'`.

### Data usage

The extension collects none of the listed kinds of data: nothing leaves the device except the requests the user sends in the API client, to the addresses they type. Check all three certifications: the data is not sold, not used or transferred for purposes unrelated to the single purpose, and not used to determine creditworthiness. The details are in [PRIVACY.md](../PRIVACY.md).
