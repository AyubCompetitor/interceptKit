import { useState } from 'react';

import type { RequestDraftPatch } from './requestDraft.ts';
import {
    closeRequestTab,
    createRequestTabs,
    getActiveTab,
    openRequestTab,
    selectRequestTab,
    updateTabDraft,
    updateTabSendState,
} from './requestTabs.ts';
import type { SendState } from './sendState.ts';

/** The open requests of the page; they live in memory until the history step keeps them */
export const useRequestTabs = () => {
    const [state, setState] = useState(createRequestTabs);

    const activeTab = getActiveTab(state);

    const onTabOpen = () => {
        setState(openRequestTab);
    };

    const onTabSelect = (tabId: string) => {
        setState(current => selectRequestTab(current, tabId));
    };

    const onTabClose = (tabId: string) => {
        setState(current => closeRequestTab(current, tabId));
    };

    /** An edit belongs to the tab on the screen */
    const onDraftChange = (patch: RequestDraftPatch) => {
        setState(current => updateTabDraft(current, current.activeId, patch));
    };

    const onSendStateChange = (tabId: string, sendState: SendState) => {
        setState(current => updateTabSendState(current, tabId, sendState));
    };

    return {
        tabs: state.tabs,
        activeTab,

        onTabOpen,
        onTabSelect,
        onTabClose,
        onDraftChange,
        onSendStateChange,
    };
};
