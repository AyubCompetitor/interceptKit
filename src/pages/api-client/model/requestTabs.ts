import {
    OPEN_REQUESTS_KEY,
    type ApiRequest,
    type CollectionLink,
    type OpenRequestLink,
    type OpenRequests,
} from '#entities/request';

import {
    buildApiRequest,
    copyRequestToDraft,
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
    /** Where the request is kept, for a tab opened from a collection or saved to one */
    readonly link?: CollectionLink;
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

const createRequestTab = (draft: RequestDraft, link?: CollectionLink): RequestTab => ({
    draft,
    sendState: IDLE_STATE,
    ...(link && { link }),
});

const mapOpenLinkToLink = ({ collectionId, requestId }: OpenRequestLink): CollectionLink => ({
    collectionId,
    requestId,
});

const isSameLink = (first: NotRequired<CollectionLink>, second: CollectionLink): boolean =>
    first?.collectionId === second.collectionId && first.requestId === second.requestId;

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

    const links = new Map(openRequests.links?.map(link => [link.tabId, mapOpenLinkToLink(link)]));

    return {
        tabs: openRequests.requests.map(request => createRequestTab(mapRequestToDraft(request), links.get(request.id))),
        activeId: openRequests.activeId,
    };
};

const getOpenLinks = (tabs: readonly RequestTab[]): OpenRequestLink[] => {
    const links: OpenRequestLink[] = [];

    for (const tab of tabs) {
        if (!tab.link) {
            continue;
        }

        links.push({ tabId: tab.draft.id, ...tab.link });
    }

    return links;
};

/** What is kept of the tabs between visits: their requests as typed and where they came from */
export const mapTabsToOpenRequests = (state: RequestTabs): OpenRequests => ({
    id: OPEN_REQUESTS_KEY,
    requests: state.tabs.map(tab => buildApiRequest(tab.draft)),
    activeId: state.activeId,
    links: getOpenLinks(state.tabs),
});

export const getActiveTab = (state: RequestTabs): RequestTab => {
    const activeTab = state.tabs.find(tab => tab.draft.id === state.activeId);

    if (activeTab === undefined) {
        throw new Error(TABS_ERRORS.NO_ACTIVE_TAB);
    }

    return activeTab;
};

/** Shows a new tab at the end: an empty request unless one is given */
export const openRequestTab = (
    state: RequestTabs,
    draft: RequestDraft = createRequestDraft(),
    link?: CollectionLink,
): RequestTabs => {
    const tab = createRequestTab(draft, link);

    return {
        tabs: [...state.tabs, tab],
        activeId: tab.draft.id,
    };
};

/** A request of a collection opens once: its tab comes to the front when it is open already */
export const openLinkedTab = (state: RequestTabs, link: CollectionLink, request: ApiRequest): RequestTabs => {
    const openTab = state.tabs.find(tab => isSameLink(tab.link, link));

    if (openTab) {
        return {
            ...state,
            activeId: openTab.draft.id,
        };
    }

    return openRequestTab(state, copyRequestToDraft(request), link);
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

export const linkRequestTab = (state: RequestTabs, tabId: string, link: CollectionLink): RequestTabs =>
    patchRequestTab(state, tabId, { link });
