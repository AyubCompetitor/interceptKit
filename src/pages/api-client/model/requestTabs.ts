import { createRequestDraft, type RequestDraft, type RequestDraftPatch } from './requestDraft.ts';
import { IDLE_STATE, type SendState } from './sendState.ts';

/** An open request with what became of its last sending */
export interface RequestTab {
    /** The request as typed; its id is the id of the tab */
    readonly draft: RequestDraft;
    /** Where its sending stands */
    readonly sendState: SendState;
}

/** The open requests of the page; there is always at least one */
export interface RequestTabs {
    /** Tabs in the order they were opened */
    readonly tabs: readonly RequestTab[];
    /** Id of the tab on the screen */
    readonly activeId: string;
}

const TABS_ERRORS = {
    NO_ACTIVE_TAB: 'the active request tab is missing',
} as const;

const createRequestTab = (): RequestTab => ({
    draft: createRequestDraft(),
    sendState: IDLE_STATE,
});

export const createRequestTabs = (): RequestTabs => {
    const tab = createRequestTab();

    return {
        tabs: [tab],
        activeId: tab.draft.id,
    };
};

export const getActiveTab = (state: RequestTabs): RequestTab => {
    const activeTab = state.tabs.find(tab => tab.draft.id === state.activeId);

    if (activeTab === undefined) {
        throw new Error(TABS_ERRORS.NO_ACTIVE_TAB);
    }

    return activeTab;
};

export const openRequestTab = (state: RequestTabs): RequestTabs => {
    const tab = createRequestTab();

    return {
        tabs: [...state.tabs, tab],
        activeId: tab.draft.id,
    };
};

export const selectRequestTab = (state: RequestTabs, tabId: string): RequestTabs => {
    const hasTab = state.tabs.some(tab => tab.draft.id === tabId);

    if (!hasTab) {
        return state;
    }

    return { ...state, activeId: tabId };
};

/** Closing the active tab shows the one that takes its place; closing the last one opens a new empty tab */
export const closeRequestTab = (state: RequestTabs, tabId: string): RequestTabs => {
    const index = state.tabs.findIndex(tab => tab.draft.id === tabId);

    if (index === -1) {
        return state;
    }

    const tabs = state.tabs.toSpliced(index, 1);
    const nextTab = tabs[Math.min(index, tabs.length - 1)];

    if (nextTab === undefined) {
        return createRequestTabs();
    }

    const isActiveClosed = tabId === state.activeId;

    return {
        tabs,
        activeId: isActiveClosed ? nextTab.draft.id : state.activeId,
    };
};

const patchRequestTab = (state: RequestTabs, tabId: string, patch: Partial<RequestTab>): RequestTabs => {
    const tabs = state.tabs.map(tab => {
        if (tab.draft.id !== tabId) {
            return tab;
        }

        return { ...tab, ...patch };
    });

    return { ...state, tabs };
};

export const updateTabDraft = (state: RequestTabs, tabId: string, patch: RequestDraftPatch): RequestTabs => {
    const tab = state.tabs.find(current => current.draft.id === tabId);

    if (tab === undefined) {
        return state;
    }

    return patchRequestTab(state, tabId, { draft: { ...tab.draft, ...patch } });
};

/** The answer for a tab closed while its request was on the way changes nothing */
export const updateTabSendState = (state: RequestTabs, tabId: string, sendState: SendState): RequestTabs => {
    return patchRequestTab(state, tabId, { sendState });
};
