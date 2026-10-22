import { useEffect, useState } from 'react';

import { apiClientDatabase, OPEN_REQUESTS_KEY, openRequestsStore, type ApiRequest } from '#entities/request';
import { API_CLIENT_CONFIG } from '#shared/config';
import { readRecord, writeRecord } from '#shared/platform';

import { copyRequestToDraft, type RequestDraftPatch } from './requestDraft.ts';
import {
    closeRequestTab,
    createRequestTabs,
    getActiveTab,
    mapTabsToOpenRequests,
    openRequestTab,
    restoreRequestTabs,
    selectRequestTab,
    updateTabDraft,
    updateTabSendState,
    type RequestTabs,
} from './requestTabs.ts';
import type { SendState } from './sendState.ts';

const logSaveFailure = (error: unknown) => console.warn('[api-client] open tabs were not saved', error);

/** The open requests of the page: restored from the last visit and saved a moment after every change */
export const useRequestTabs = () => {
    const [state, setState] = useState<NotRequired<RequestTabs>>();

    useEffect(() => {
        /** Lives in the effect: tabs that arrive after cleanup are dropped */
        let isActive = true;

        const onTabsRestore = (nextState: RequestTabs) => {
            if (isActive) {
                setState(nextState);
            }
        };

        readRecord(apiClientDatabase, openRequestsStore, OPEN_REQUESTS_KEY)
            .then(openRequests => onTabsRestore(restoreRequestTabs(openRequests)))
            .catch(() => onTabsRestore(createRequestTabs()));

        return () => {
            isActive = false;
        };
    }, []);

    useEffect(() => {
        if (state === undefined) {
            return;
        }

        const timer = window.setTimeout(() => {
            writeRecord(apiClientDatabase, openRequestsStore, mapTabsToOpenRequests(state)).catch(logSaveFailure);
        }, API_CLIENT_CONFIG.TABS_SAVE_DELAY_MS);

        return () => window.clearTimeout(timer);
    }, [state]);

    const activeTab = state && getActiveTab(state);
    const isLoading = state === undefined;

    /** Changes are ignored until the saved tabs are back */
    const updateState = (update: (current: RequestTabs) => RequestTabs) => {
        setState(current => current && update(current));
    };

    const onTabOpen = () => {
        updateState(current => openRequestTab(current));
    };

    const onRequestOpen = (request: ApiRequest) => {
        updateState(current => openRequestTab(current, copyRequestToDraft(request)));
    };

    const onTabSelect = (tabId: string) => {
        updateState(current => selectRequestTab(current, tabId));
    };

    const onTabClose = (tabId: string) => {
        updateState(current => closeRequestTab(current, tabId));
    };

    /** An edit belongs to the tab on the screen */
    const onDraftChange = (patch: RequestDraftPatch) => {
        updateState(current => updateTabDraft(current, current.activeId, patch));
    };

    const onSendStateChange = (tabId: string, sendState: SendState) => {
        updateState(current => updateTabSendState(current, tabId, sendState));
    };

    return {
        tabs: state?.tabs ?? [],
        activeTab,

        isLoading,

        onTabOpen,
        onRequestOpen,
        onTabSelect,
        onTabClose,
        onDraftChange,
        onSendStateChange,
    };
};
