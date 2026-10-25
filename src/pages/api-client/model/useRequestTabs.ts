import { useEffect, useState } from 'react';

import {
    apiClientDatabase,
    OPEN_REQUESTS_KEY,
    openRequestsStore,
    type ApiRequest,
    type CollectionLink,
    type CurlImport,
} from '#entities/request';
import { API_CLIENT_CONFIG } from '#shared/config';
import { subscribeOnce } from '#shared/lib';
import { readRecord, writeRecord } from '#shared/platform';

import { copyRequestToDraft, mapCurlToDraft, type RequestDraftPatch } from './requestDraft.ts';
import {
    closeRequestTab,
    createRequestTabs,
    getActiveTab,
    linkRequestTab,
    mapTabsToOpenRequests,
    openLinkedTab,
    openRequestTab,
    restoreRequestTabs,
    selectRequestTab,
    updateTabDraft,
    updateTabSendState,
    type RequestTabs,
} from './requestTabs.ts';
import type { SendState } from './sendState.ts';

const logSaveFailure = (error: unknown) => console.warn('[api-client] open tabs were not saved', error);

const loadRequestTabs = async (): Promise<RequestTabs> => {
    const openRequests = await readRecord(apiClientDatabase, openRequestsStore, OPEN_REQUESTS_KEY);

    return restoreRequestTabs(openRequests);
};

/** The tabs of the last visit; one empty tab when they cannot be read */
const subscribeSavedTabs = (listener: (tabs: RequestTabs) => void): VoidFunction =>
    subscribeOnce(loadRequestTabs(), createRequestTabs(), listener);

export const useRequestTabs = () => {
    const [state, setState] = useState<NotRequired<RequestTabs>>();

    useEffect(() => subscribeSavedTabs(setState), []);

    useEffect(() => {
        if (!state) {
            return;
        }

        const timer = window.setTimeout(() => {
            writeRecord(apiClientDatabase, openRequestsStore, mapTabsToOpenRequests(state)).catch(logSaveFailure);
        }, API_CLIENT_CONFIG.TABS_SAVE_DELAY_MS);

        return () => window.clearTimeout(timer);
    }, [state]);

    const activeTab = state && getActiveTab(state);
    const isLoading = state === undefined;

    const updateState = (update: (current: RequestTabs) => RequestTabs) => {
        setState(current => current && update(current));
    };

    const onTabOpen = () => {
        updateState(current => openRequestTab(current));
    };

    const onRequestOpen = (request: ApiRequest) => {
        updateState(current => openRequestTab(current, copyRequestToDraft(request)));
    };

    const onCurlImport = (imported: CurlImport) => {
        updateState(current => openRequestTab(current, mapCurlToDraft(imported)));
    };

    const onCollectionRequestOpen = (link: CollectionLink, request: ApiRequest) => {
        updateState(current => openLinkedTab(current, link, request));
    };

    const onTabLink = (tabId: string, link: CollectionLink) => {
        updateState(current => linkRequestTab(current, tabId, link));
    };

    const onTabSelect = (tabId: string) => {
        updateState(current => selectRequestTab(current, tabId));
    };

    const onTabClose = (tabId: string) => {
        updateState(current => closeRequestTab(current, tabId));
    };

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
        onCurlImport,
        onCollectionRequestOpen,
        onTabLink,
        onTabSelect,
        onTabClose,
        onDraftChange,
        onSendStateChange,
    };
};
