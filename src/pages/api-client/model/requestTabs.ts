import { OPEN_REQUESTS_KEY, type OpenRequests } from '#entities/request';

import {
    buildApiRequest,
    createRequestDraft,
    mapRequestToDraft,
    type RequestDraft,
    type RequestDraftPatch,
} from './requestDraft.ts';
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

const createRequestTab = (draft: RequestDraft): RequestTab => ({
    draft,
    sendState: IDLE_STATE,
});

export const createRequestTabs = (): RequestTabs => {
    const tab = createRequestTab(createRequestDraft());

    return {
        tabs: [tab],
        activeId: tab.draft.id,
    };
};

/** The tabs saved on the last visit, without their responses; one empty tab when nothing was saved */
export const restoreRequestTabs = (openRequests: NotRequired<OpenRequests>): RequestTabs => {
    if (openRequests === undefined) {
        return createRequestTabs();
    }

    return {
        tabs: openRequests.requests.map(request => createRequestTab(mapRequestToDraft(request))),
        activeId: openRequests.activeId,
    };
};

/** What is kept of the tabs between visits: their requests as typed */
export const mapTabsToOpenRequests = (state: RequestTabs): OpenRequests => ({
    id: OPEN_REQUESTS_KEY,
    requests: state.tabs.map(tab => buildApiRequest(tab.draft)),
    activeId: state.activeId,
});

export const getActiveTab = (state: RequestTabs): RequestTab => {
    const activeTab = state.tabs.find(tab => tab.draft.id === state.activeId);

    if (activeTab === undefined) {
        throw new Error(TABS_ERRORS.NO_ACTIVE_TAB);
    }

    return activeTab;
};

/** Shows a new tab at the end: an empty request unless one is given */
export const openRequestTab = (state: RequestTabs, draft: RequestDraft = createRequestDraft()): RequestTabs => {
    const tab = createRequestTab(draft);

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

    return {
        ...state,
        activeId: tabId,
    };
};

/** Closing the active tab shows the one that takes its place; closing the last one opens a new empty tab */
export const closeRequestTab = (state: RequestTabs, tabId: string): RequestTabs => {
    const idx = state.tabs.findIndex(tab => tab.draft.id === tabId);

    if (idx === -1) {
        return state;
    }

    const tabs = state.tabs.toSpliced(idx, 1);
    const nextTab = tabs[Math.min(idx, tabs.length - 1)];

    if (nextTab === undefined) {
        return createRequestTabs();
    }

    const isActiveClosed = tabId === state.activeId;
    const activeId = isActiveClosed ? nextTab.draft.id : state.activeId;

    return {
        tabs,
        activeId,
    };
};

const patchRequestTab = (state: RequestTabs, tabId: string, patch: Partial<RequestTab>): RequestTabs => {
    const tabs = state.tabs.map(tab => {
        if (tab.draft.id !== tabId) {
            return tab;
        }

        return {
            ...tab,
            ...patch,
        };
    });

    return {
        ...state,
        tabs,
    };
};

export const updateTabDraft = (state: RequestTabs, tabId: string, patch: RequestDraftPatch): RequestTabs => {
    const tab = state.tabs.find(current => current.draft.id === tabId);

    if (tab === undefined) {
        return state;
    }

    return patchRequestTab(state, tabId, { draft: { ...tab.draft, ...patch } });
};

export const updateTabSendState = (state: RequestTabs, tabId: string, sendState: SendState): RequestTabs =>
    patchRequestTab(state, tabId, { sendState });
