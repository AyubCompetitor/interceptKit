import { describe, expect, it } from '@rstest/core';

import {
    closeRequestTab,
    createRequestTabs,
    getActiveTab,
    openRequestTab,
    selectRequestTab,
    updateTabDraft,
    updateTabSendState,
    type RequestTabs,
} from '../requestTabs.ts';
import { SENDING_STATE } from '../sendState.ts';

/** Three tabs, the second one on the screen */
const makeThreeTabs = (): RequestTabs => {
    const opened = openRequestTab(openRequestTab(createRequestTabs()));
    const [, second] = opened.tabs;

    return selectRequestTab(opened, second?.draft.id ?? '');
};

const getIds = (state: RequestTabs): string[] => state.tabs.map(tab => tab.draft.id);

describe('request tabs', () => {
    it('start with one empty tab on the screen', () => {
        const state = createRequestTabs();

        expect(state.tabs).toHaveLength(1);

        expect(getActiveTab(state).draft.url).toBe('');
    });

    it('show a new tab at the end', () => {
        const state = openRequestTab(createRequestTabs());

        expect(state.activeId).toBe(getIds(state)[1]);
    });

    it('ignore a tab that is gone', () => {
        const state = createRequestTabs();

        expect(selectRequestTab(state, 'gone')).toBe(state);

        expect(closeRequestTab(state, 'gone')).toBe(state);
    });

    describe('closing', () => {
        it('shows the tab that takes the place of the active one', () => {
            const state = makeThreeTabs();
            const [, second, third] = getIds(state);

            expect(closeRequestTab(state, second ?? '').activeId).toBe(third);
        });

        it('shows the new last tab when the last one closes', () => {
            const state = makeThreeTabs();
            const [, second, third] = getIds(state);
            const lastShown = selectRequestTab(state, third ?? '');

            expect(closeRequestTab(lastShown, third ?? '').activeId).toBe(second);
        });

        it('keeps the active tab when another one closes', () => {
            const state = makeThreeTabs();
            const [first] = getIds(state);

            expect(closeRequestTab(state, first ?? '').activeId).toBe(state.activeId);
        });

        it('opens an empty tab after the last one', () => {
            const state = createRequestTabs();
            const nextState = closeRequestTab(state, state.activeId);

            expect(nextState.tabs).toHaveLength(1);

            expect(nextState.activeId).not.toBe(state.activeId);
        });
    });

    it('change only the tab with the id', () => {
        const state = makeThreeTabs();
        const [firstId = ''] = getIds(state);

        const edited = updateTabDraft(state, firstId, { url: 'https://a.test' });
        const nextState = updateTabSendState(edited, firstId, SENDING_STATE);

        expect(nextState.tabs[0]).toMatchObject({ draft: { url: 'https://a.test' }, sendState: SENDING_STATE });

        expect(nextState.tabs[1]).toBe(state.tabs[1]);
    });
});
