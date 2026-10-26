import { findTabLocation, getLinkedTabNames, isTabUnsaved } from './collectionTabs.ts';
import { SendStateTypes } from './sendState.ts';
import { useActiveEnvironment } from './useActiveEnvironment.ts';
import { useRequestSender } from './useRequestSender.ts';
import { useRequestTabs } from './useRequestTabs.ts';
import { useTabSaving } from './useTabSaving.ts';
import { useVaultSecrets } from './useVaultSecrets.ts';

export const useApiClient = () => {
    const activeEnvironment = useActiveEnvironment();
    const secrets = useVaultSecrets(activeEnvironment);
    const {
        tabs,
        activeTab,
        isLoading,
        onTabOpen,
        onRequestOpen,
        onCurlImport,
        onCollectionRequestOpen,
        onTabLink,
        onTabSelect,
        onTabClose,
        onDraftChange,
        onSendStateChange,
    } = useRequestTabs();

    const { onRequestSend, onRequestCancel } = useRequestSender(onSendStateChange);
    const {
        collections,
        isLimitReached,
        isSaveDialogOpen,
        isSaveFailed,
        onActiveTabSave,
        onSaveAs,
        onSaveDialogClose,
    } = useTabSaving(activeTab, onTabLink);

    const isSending = activeTab?.sendState.stateType === SendStateTypes.SENDING;
    const unsavedTabIds = tabs.filter(tab => isTabUnsaved(tab, collections)).map(tab => tab.draft.id);
    const tabNames = getLinkedTabNames(tabs, collections);
    const activeLocation = findTabLocation(activeTab, collections);

    const onActiveRequestSend = () => {
        if (!activeTab || isSending) {
            return;
        }

        onRequestSend(activeTab.draft, activeEnvironment, secrets);
    };

    const onActiveRequestCancel = () => {
        if (!activeTab) {
            return;
        }

        onRequestCancel(activeTab.draft.id);
    };

    const onRequestTabClose = (tabId: string) => {
        onRequestCancel(tabId);
        onTabClose(tabId);
    };

    return {
        tabs,
        activeTab,
        collections,
        unsavedTabIds,
        tabNames,
        activeLocation,

        isLoading,
        isSending,
        isLimitReached,
        isSaveDialogOpen,
        isSaveFailed,

        onTabOpen,
        onRequestOpen,
        onCurlImport,
        onCollectionRequestOpen,
        onTabSelect,
        onRequestTabClose,
        onDraftChange,
        onActiveRequestSend,
        onActiveRequestCancel,
        onActiveTabSave,
        onSaveAs,
        onSaveDialogClose,
    };
};
