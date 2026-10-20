export const getHostPermissions = async (): Promise<string[]> => {
    const { origins = [] } = await chrome.permissions.getAll();

    return origins;
};

export const requestHostAccess = (pattern: string): Promise<boolean> =>
    chrome.permissions.request({
        origins: [pattern],
    });

export const revokeHostAccess = (pattern: string): Promise<boolean> =>
    chrome.permissions.remove({
        origins: [pattern],
    });

/** Calls listener whenever host access is granted or revoked */
export const watchHostAccess = (listener: VoidFunction): VoidFunction => {
    chrome.permissions.onAdded.addListener(listener);
    chrome.permissions.onRemoved.addListener(listener);

    return () => {
        chrome.permissions.onAdded.removeListener(listener);
        chrome.permissions.onRemoved.removeListener(listener);
    };
};
