import pkg from '../package.json' with { type: 'json' };

/** Drawn by build/icons.ts from the brand glyph */
const ICONS = {
    16: 'icons/icon-16.png',
    32: 'icons/icon-32.png',
    48: 'icons/icon-48.png',
    128: 'icons/icon-128.png',
};

/**
 * The extension manifest: the single reviewed source of truth.
 * Every permission here must be justified in docs/PERMISSIONS.md.
 */
export const buildManifest = (): chrome.runtime.ManifestV3 => ({
    manifest_version: 3,
    name: '__MSG_extName__',
    short_name: 'XRequest',
    description: '__MSG_extDescription__',
    version: pkg.version,
    default_locale: 'en',
    minimum_chrome_version: '140',
    icons: ICONS,
    permissions: ['storage', 'declarativeNetRequestWithHostAccess', 'scripting', 'alarms'],
    optional_host_permissions: ['*://*/*'],
    storage: { managed_schema: 'managed-schema.json' },
    background: { service_worker: 'background/background.js' },
    action: {
        default_title: '__MSG_extName__',
        default_popup: 'pages/popup.html',
        default_icon: { 16: ICONS[16], 32: ICONS[32] },
    },
    options_ui: { page: 'pages/options.html', open_in_tab: true },
    content_security_policy: {
        extension_pages:
            "script-src 'self'; style-src 'self'; img-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'",
    },
});
