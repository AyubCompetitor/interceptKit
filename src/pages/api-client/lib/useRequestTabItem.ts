/** Binds the buttons of one tab to its id */
export const useRequestTabItem = (
    tabId: string,
    onSelect: (tabId: string) => void,
    onClose: (tabId: string) => void,
) => {
    const onTabSelect = () => {
        onSelect(tabId);
    };

    const onTabClose = () => {
        onClose(tabId);
    };

    return {
        onTabSelect,
        onTabClose,
    };
};
