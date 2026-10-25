import { useState } from 'react';

import type { CollectionLink } from '#entities/request';

import { buildSavedRequest, findCollection, findLinkedRequest } from './collectionTabs.ts';
import { buildApiRequest } from './requestDraft.ts';
import type { RequestTab } from './requestTabs.ts';
import { useCollections, type SaveTarget } from './useCollections.ts';

/** A tab of a collection saves in place; any other tab asks where to save */
export const useTabSaving = (
    activeTab: NotRequired<RequestTab>,
    onTabLink: (tabId: string, link: CollectionLink) => void,
) => {
    const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);

    const {
        collections,
        isLimitReached,
        isActionFailed: isSaveFailed,
        onRequestSave,
        onRequestSaveAs,
    } = useCollections();

    const onActiveTabSave = () => {
        const link = activeTab?.link;
        const collection = link && findCollection(collections, link.collectionId);
        const isKept = !!findLinkedRequest(collections, link);

        if (!activeTab) {
            return;
        }

        if (!link || !collection || !isKept) {
            setIsSaveDialogOpen(true);

            return;
        }

        onRequestSave(collection, buildSavedRequest(activeTab, link.requestId));
    };

    const onSaveAs = (target: SaveTarget) => {
        if (!activeTab) {
            return;
        }

        const tabId = activeTab.draft.id;

        const onSaved = (link: CollectionLink) => {
            onTabLink(tabId, link);
            setIsSaveDialogOpen(false);
        };

        onRequestSaveAs(target, buildApiRequest(activeTab.draft), onSaved);
    };

    const onSaveDialogClose = () => setIsSaveDialogOpen(false);

    return {
        collections,
        isLimitReached,
        isSaveDialogOpen,
        isSaveFailed,
        onActiveTabSave,
        onSaveAs,
        onSaveDialogClose,
    };
};
