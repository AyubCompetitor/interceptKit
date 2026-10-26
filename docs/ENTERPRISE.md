# XRequest in an organization

An administrator can install XRequest for everyone and limit what it does through the browser's policy for extensions. The extension reads that policy from `chrome.storage.managed`, applies it at once, and shows it to the user in the dashboard's **Organization policy** section.

Without a policy nothing is restricted: a person who installs the extension alone is their own administrator, and every feature works.

## Install for everyone

Force the installation with the `ExtensionSettings` policy. For the Chrome Web Store:

```json
{
    "<extension-id>": {
        "installation_mode": "force_installed",
        "update_url": "https://clients2.google.com/service/update2/crx"
    }
}
```

For Microsoft Edge Add-ons, the update URL is `https://edge.microsoft.com/extensionwebstorebase/v1/crx`. `<extension-id>` is the 32-letter id on the extension's store page and in `chrome://extensions`.

## Policies

| Policy             | Type             | What it does                                                             | If absent       | If present but invalid         |
| ------------------ | ---------------- | ------------------------------------------------------------------------ | --------------- | ------------------------------ |
| `disabledFeatures` | list of strings  | Turns off features: `redirect`, `headers`, `block`, `mocks`, `apiClient` | Everything on   | Every feature off              |
| `allowedHosts`     | list of strings  | The only sites the extension may get access to                           | Any site        | No site                        |
| `allowUserRules`   | boolean          | `false`: only the rules and mocks of the policy apply                    | User rules work | Only the policy's rules apply  |
| `requireVault`     | boolean          | `true`: API client secrets must be encrypted with a master password      | Optional        | Required                       |
| `presetBundle`     | string with JSON | Rules and mocks for everyone, in the format of an XRequest export        | None            | None, and the errors are shown |

A restricting field that is present but invalid is read in its strictest form, so a typo never lifts a restriction. An unknown policy name that reaches the extension is ignored and reported.

### disabledFeatures

`redirect`, `headers` and `block` turn off rules of that type, `mocks` turns off every mock, and `apiClient` closes the API client: its page shows a notice, the popup and the dashboard lose their links to it, and the history the user had stays where it was. The dashboard marks what the policy turned off.

### allowedHosts

- `example.com` allows that host alone; `*.example.com` allows it and every subdomain. The scheme and the port do not matter; up to 1,000 entries.
- An empty list allows no site at all.
- The dashboard and the API client never ask the browser for a site outside the list, and the API client does not send there.
- Access the user had outside the list is taken away when the policy arrives, and again whenever access is granted, including through the browser's own extensions menu. Mock scripts are never registered for such a site.

### allowUserRules

With `false`, the rules and mocks the user made stay editable but do not apply, and the dashboard says so on each of them. Only the records of `presetBundle` work.

### requireVault

With `true`:

- secret values of API client environments are not saved until the user turns on encryption with a master password;
- the API client does not send a request with a secret that was stored unencrypted before the policy; turning encryption on encrypts those values;
- the vault cannot be turned off. "Forgot password?" still works: it deletes the encrypted values, and the user sets up the vault again.

### presetBundle

The value is the text of an XRequest export, as a string. To make one, set the rules and mocks up in a browser, open **Import and export** in the dashboard, export rules and mocks, and paste the file's contents into the policy. A minimal bundle with one block rule:

```json
{
    "format": "xrequest",
    "version": 1,
    "rules": [
        {
            "id": "block-ads",
            "name": "Block ads",
            "enabled": true,
            "type": "block",
            "match": { "url": { "syntaxType": "filter", "value": "||ads.example.com^" } }
        }
    ]
}
```

- The records stand first in their lists, so they win over the user's own, and carry the label **From the organization**. The user cannot edit, switch or delete them.
- Ids get the prefix `policy:` and must not have it in the file.
- Environments are never taken from the policy: a value in the registry or a profile is readable by anyone on the machine, so it is no place for secrets.
- A broken bundle brings nothing, and the policy section names each error with its place, such as `$.presetBundle.rules[0]`.
- The value may be up to 1,000,000 characters. Together with the user's records it must fit the extension's limits of 5,000 rules and 1,000 mocks.
- Mocks still work only on sites the user granted and turned mocks on for.

## Setting the policy

The examples allow subdomains of `example.com` and `localhost`, require the vault and turn the API client off. Replace `<extension-id>` with the real id.

### Linux

Put a JSON file into `/etc/opt/chrome/policies/managed/` for Google Chrome, or `/etc/chromium/policies/managed/` for Chromium:

```json
{
    "3rdparty": {
        "extensions": {
            "<extension-id>": {
                "allowedHosts": ["*.example.com", "localhost"],
                "requireVault": true,
                "disabledFeatures": ["apiClient"],
                "presetBundle": "{\"format\":\"xrequest\",\"version\":1,\"rules\":[]}"
            }
        }
    }
}
```

### Windows

Chrome reads the policy of an extension from `HKLM\Software\Policies\Google\Chrome\3rdparty\extensions\<extension-id>\policy` (`HKCU` works too). A list is a subkey with values named `1`, `2` and so on:

```reg
Windows Registry Editor Version 5.00

[HKEY_LOCAL_MACHINE\Software\Policies\Google\Chrome\3rdparty\extensions\<extension-id>\policy]
"requireVault"=dword:00000001
"presetBundle"="{\"format\":\"xrequest\",\"version\":1,\"rules\":[]}"

[HKEY_LOCAL_MACHINE\Software\Policies\Google\Chrome\3rdparty\extensions\<extension-id>\policy\allowedHosts]
"1"="*.example.com"
"2"="localhost"

[HKEY_LOCAL_MACHINE\Software\Policies\Google\Chrome\3rdparty\extensions\<extension-id>\policy\disabledFeatures]
"1"="apiClient"
```

The path and the lists follow [Chromium's guide](https://www.chromium.org/administrators/configuring-policy-for-extensions/); booleans as `REG_DWORD` are how Chromium reads them, not something the guide shows, so check the result in `chrome://policy`. For Microsoft Edge the same layout is expected under `HKLM\Software\Policies\Microsoft\Edge\3rdparty\extensions\<extension-id>\policy`; Microsoft does not document that path, so check it in `edge://policy`.

### macOS

Chrome reads the policy from the preference domain `com.google.Chrome.extensions.<extension-id>` (`org.chromium.Chromium.extensions.<extension-id>` for Chromium). In a configuration profile, the values go into a `com.apple.ManagedClient.preferences` payload, with the id in place of `EXTENSION_ID`:

```xml
<key>com.google.Chrome.extensions.EXTENSION_ID</key>
<dict>
    <key>Forced</key>
    <array>
        <dict>
            <key>mcx_preference_settings</key>
            <dict>
                <key>allowedHosts</key>
                <array>
                    <string>*.example.com</string>
                    <string>localhost</string>
                </array>
                <key>requireVault</key>
                <true/>
            </dict>
        </dict>
    </array>
</dict>
```

### Google Admin console

The Admin console takes the policy of an extension as JSON, with each value under `Value` ([Chromium's guide](https://www.chromium.org/administrators/configuring-policy-for-extensions/)):

```json
{
    "allowedHosts": { "Value": ["*.example.com", "localhost"] },
    "requireVault": { "Value": true },
    "disabledFeatures": { "Value": ["apiClient"] }
}
```

## Checking the result

1. Open `chrome://policy` (`edge://policy` in Edge) and click **Reload policies**. The extension is listed with the values the browser loaded.
2. Open the dashboard's **Organization policy** section. It shows what the extension received, after the fail-closed reading, and every error. Changes apply at once, without a restart.

The browser publishes no value that fails the extension's schema: a list given as a single string, or `"true"` as a string, never reaches the extension, so its restriction does not apply. If a field you set reads **Not set** in the dashboard, check its type.

## Browser controls to add

The policy is enforced by the extension's own code. For a line the user cannot cross even with DevTools on the extension's pages, add the browser's controls:

- `ExtensionSettings` with `runtime_blocked_hosts` and `runtime_allowed_hosts` keeps extensions away from sites: Google's documentation names script injection, cookie access and web-request modifications. It does not say whether `declarativeNetRequest` rules are covered. Up to 100 entries, in the form `*://*.example.com`.
- `DeveloperToolsAvailability` can turn DevTools off.

## What XRequest never does

It has no server, accounts, telemetry or analytics, and it sends nothing on its own: the only requests are the ones a user sends in the API client. Everything it keeps stays in the browser profile; people share rules and mocks through JSON files. The permissions and the reasons for them are in [PERMISSIONS.md](PERMISSIONS.md), the threat model in [THREAT_MODEL.md](THREAT_MODEL.md).
