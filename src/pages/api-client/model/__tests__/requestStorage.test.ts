import { describe, expect, it } from '@rstest/core';

import { buildHistoryEntry } from '../historyEntries.ts';
import { buildApiRequest, copyRequestToDraft, mapRequestToDraft } from '../requestDraft.ts';
import { mapTabsToOpenRequests, openRequestTab, restoreRequestTabs } from '../requestTabs.ts';
import { IDLE_STATE } from '../sendState.ts';

import { OPEN_REQUESTS_KEY, RequestBodyTypes, type ApiRequest } from '#entities/request';
import { HttpMethods } from '#shared/lib';

import { makeResponse } from './mocks.ts';

const POST_REQUEST: ApiRequest = {
    id: 'q1',
    method: HttpMethods.POST,
    url: '{{baseUrl}}/users',
    query: [{ key: 'page', value: '2', enabled: true }],
    headers: [{ key: 'Authorization', value: 'Bearer {{token}}', enabled: false }],
    body: { bodyType: RequestBodyTypes.FORM, fields: [{ key: 'name', value: 'Ada', enabled: true }] },
    sendCookies: true,
};

describe('saved requests', () => {
    it('come back to a tab unchanged', () => {
        expect(buildApiRequest(mapRequestToDraft(POST_REQUEST))).toEqual(POST_REQUEST);
    });

    it('open from the history in a tab of their own', () => {
        const draft = copyRequestToDraft(POST_REQUEST);

        expect(draft.id).not.toBe(POST_REQUEST.id);

        expect(buildApiRequest(draft)).toEqual({ ...POST_REQUEST, id: draft.id });
    });
});

describe('open tabs', () => {
    it('are saved and restored in their order with the same tab on the screen', () => {
        const state = openRequestTab(restoreRequestTabs(undefined), mapRequestToDraft(POST_REQUEST));
        const openRequests = mapTabsToOpenRequests(state);

        expect(openRequests).toMatchObject({ id: OPEN_REQUESTS_KEY, activeId: POST_REQUEST.id });

        expect(restoreRequestTabs(openRequests).tabs.map(tab => buildApiRequest(tab.draft))).toEqual(
            openRequests.requests,
        );
    });

    it('come back without their responses', () => {
        const openRequests = { id: OPEN_REQUESTS_KEY, requests: [POST_REQUEST], activeId: POST_REQUEST.id } as const;

        expect(restoreRequestTabs(openRequests).tabs[0]?.sendState).toBe(IDLE_STATE);
    });

    it('start with one empty tab when nothing was saved', () => {
        expect(restoreRequestTabs(undefined).tabs).toHaveLength(1);
    });
});

describe('buildHistoryEntry', () => {
    it.each([
        { name: 'with the summary of a response', response: makeResponse(), summary: { status: 200 } },
        { name: 'without a response when none came', response: undefined, summary: undefined },
    ])('makes an entry $name', ({ response, summary }) => {
        const entry = buildHistoryEntry(POST_REQUEST, 1_000, response);

        expect(entry).toMatchObject({ sentAt: 1_000, request: POST_REQUEST });

        expect(entry.response).toEqual(summary && expect.objectContaining(summary));
    });
});
