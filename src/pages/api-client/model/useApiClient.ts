import { SendStateTypes } from './sendState.ts';
import { useRequestSender } from './useRequestSender.ts';
import { useRequestTabs } from './useRequestTabs.ts';

/** The tabs of the page and the sending of the one on the screen */
export const useApiClient = () => {
    const { tabs, activeTab, onTabOpen, onTabSelect, onTabClose, onDraftChange, onSendStateChange } = useRequestTabs();
    const { onRequestSend, onRequestCancel } = useRequestSender(onSendStateChange);

    const isSending = activeTab.sendState.stateType === SendStateTypes.SENDING;

    /** A tab sends one request at a time: Enter in a field during sending does nothing */
    const onActiveRequestSend = () => {
        if (isSending) {
            return;
        }

        onRequestSend(activeTab.draft);
    };

    const onActiveRequestCancel = () => {
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

        isSending,

        onTabOpen,
        onTabSelect,
        onRequestTabClose,
        onDraftChange,
        onActiveRequestSend,
        onActiveRequestCancel,
    };
};
