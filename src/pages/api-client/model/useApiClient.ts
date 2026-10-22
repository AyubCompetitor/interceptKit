import { SendStateTypes } from './sendState.ts';
import { useActiveEnvironment } from './useActiveEnvironment.ts';
import { useRequestSender } from './useRequestSender.ts';
import { useRequestTabs } from './useRequestTabs.ts';

/** The tabs of the page and the sending of the one on the screen, with the variables of the chosen environment */
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

    /** A tab sends one request at a time: Enter in a field during sending does nothing */
    const onActiveRequestSend = () => {
        if (activeTab === undefined || isSending) {
            return;
        }

        onRequestSend(activeTab.draft, activeEnvironment);
    };

    const onActiveRequestCancel = () => {
        if (activeTab === undefined) {
            return;
        }

        onRequestCancel(activeTab.draft.id);
    };

    /** A closed tab takes its request on the way with it */
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
