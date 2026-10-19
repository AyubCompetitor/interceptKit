/** Paths of extension pages, relative to the extension root. */
export const EXTENSION_PAGES = {
    API_CLIENT: 'pages/api-client.html',
} as const;

export const openOptionsPage = (): Promise<void> => chrome.runtime.openOptionsPage();

export const openExtensionPage = async (path: string): Promise<void> => {
    await chrome.tabs.create({ url: chrome.runtime.getURL(path) });
};

export const getUILanguage = (): string => chrome.i18n.getUILanguage();
