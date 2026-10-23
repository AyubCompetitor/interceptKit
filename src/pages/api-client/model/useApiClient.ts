import { SendStateTypes } from './sendState.ts';
import { useActiveEnvironment } from './useActiveEnvironment.ts';
import { useRequestSender } from './useRequestSender.ts';
import { useRequestTabs } from './useRequestTabs.ts';

export const useApiClient = () => {
    const activeEnvironment = useActiveEnvironment();
    const {
        tabs,
        activeTab,
        isLoading,
        onTabOpen,
        onRequestOpen,
        onTabSelect,
        onTabClose,
        onDraftChange,
        onSendStateChange,
    } = useRequestTabs();

    const { onRequestSend, onRequestCancel } = useRequestSender(onSendStateChange);

    const isSending = activeTab?.sendState.stateType === SendStateTypes.SENDING;

    const onActiveRequestSend = () => {
        if (!activeTab || isSending) {
            return;
        }

        onRequestSend(activeTab.draft, activeEnvironment);
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

        isLoading,
        isSending,

        onTabOpen,
        onRequestOpen,
        onTabSelect,
        onRequestTabClose,
        onDraftChange,
        onActiveRequestSend,
        onActiveRequestCancel,
    };
};
