import { describe, expect, it } from '@rstest/core';

import { createRequestItem, type Collection } from '#entities/request';

import { getLinkedTabNames, isTabUnsaved } from '../collectionTabs.ts';
import { buildApiRequest } from '../requestDraft.ts';
import {
    createRequestTabs,
    getActiveTab,
    linkRequestTab,
    mapTabsToOpenRequests,
    openLinkedTab,
    restoreRequestTabs,
    updateTabDraft,
} from '../requestTabs.ts';

import { makeDraft } from './mocks.ts';

const KEPT_REQUEST = {
    ...buildApiRequest(makeDraft({ url: 'https://api.example.com/users' })),
    id: 'kept',
    name: 'List users',
};

const COLLECTION: Collection = {
    id: 'shop',
    name: 'Shop API',
    createdAt: 1,
    items: [createRequestItem(KEPT_REQUEST)],
};

const LINK = { collectionId: COLLECTION.id, requestId: KEPT_REQUEST.id };

const openKept = () => openLinkedTab(createRequestTabs(), LINK, KEPT_REQUEST);

describe('tabs of a collection', () => {
    it('open a request once and bring its tab to the front later', () => {
        const opened = openKept();
        const [first] = opened.tabs;
        const again = openLinkedTab({ ...opened, activeId: first?.draft.id ?? '' }, LINK, KEPT_REQUEST);

        expect(opened.tabs).toHaveLength(2);

        expect(again.tabs).toHaveLength(2);

        expect(getActiveTab(again).link).toEqual(LINK);
    });

    it('keep their links between visits', () => {
        const opened = openKept();
        const restored = restoreRequestTabs(mapTabsToOpenRequests(opened));

        expect(getActiveTab(restored).link).toEqual(LINK);

        expect(restored.tabs[0]?.link).toBeUndefined();
    });

    it('link a tab once it is saved', () => {
        const state = createRequestTabs();

        expect(getActiveTab(linkRequestTab(state, state.activeId, LINK)).link).toEqual(LINK);
    });
});

describe('getLinkedTabNames', () => {
    it('names a tab after its request in the collection, as it is called now', () => {
        const opened = openKept();
        const renamed: Collection = {
            ...COLLECTION,
            items: [createRequestItem({ ...KEPT_REQUEST, name: 'All users' })],
        };

        expect(getLinkedTabNames(opened.tabs, [renamed])).toEqual(new Map([[opened.activeId, 'All users']]));
    });

    it('leaves out tabs without a request in the collections', () => {
        expect(getLinkedTabNames(openKept().tabs, [])).toEqual(new Map());
    });
});

describe('isTabUnsaved', () => {
    it('is false while the tab sends what the collection keeps', () => {
        expect(isTabUnsaved(getActiveTab(openKept()), [COLLECTION])).toBe(false);
    });

    it('is true once the request changes', () => {
        const opened = openKept();
        const changed = updateTabDraft(opened, opened.activeId, { url: 'https://api.example.com/orders' });

        expect(isTabUnsaved(getActiveTab(changed), [COLLECTION])).toBe(true);
    });

    it('is false for a tab whose request is gone from the collections', () => {
        const opened = openKept();
        const changed = updateTabDraft(opened, opened.activeId, { url: 'https://api.example.com/orders' });

        expect(isTabUnsaved(getActiveTab(changed), [])).toBe(false);
    });
});
