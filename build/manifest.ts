import pkg from '../package.json' with { type: 'json' };

/**
 * The extension manifest: the single reviewed source of truth.
 * Every permission here must be justified in docs/PERMISSIONS.md.
 */
export const buildManifest = (): chrome.runtime.ManifestV3 => ({
    manifest_version: 3,
    name: '__MSG_extName__',
    short_name: 'InterceptKit',
    description: '__MSG_extDescription__',
    version: pkg.version,
    default_locale: 'en',
    /** First version where storage.local.setAccessLevel() closes the area to content scripts. */
    minimum_chrome_version: '140',
    permissions: ['storage'],
    storage: { managed_schema: 'managed-schema.json' },
    background: { service_worker: 'background/background.js' },
    action: { default_title: '__MSG_extName__', default_popup: 'pages/popup.html' },
    options_ui: { page: 'pages/options.html', open_in_tab: true },
    content_security_policy: {
        extension_pages: "script-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'",
    },
});
