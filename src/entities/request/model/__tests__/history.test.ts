import { describe, expect, it } from '@rstest/core';

import { HttpMethods, validate } from '#shared/lib';

import { historyEntryValidator, mapResponseToSummary, sortHistoryEntries, type HistoryEntry } from '../history.ts';
import { RequestBodyTypes, type ApiRequest } from '../request.ts';

import { makeRequest } from './mocks.ts';

const GET_REQUEST: ApiRequest = {
    id: 'q1',
    method: HttpMethods.GET,
    url: 'https://api.example.com',
    query: [],
    headers: [],
    body: { bodyType: RequestBodyTypes.NONE },
    sendCookies: false,
};

const makeHistoryEntry = (id: string, sentAt: number): HistoryEntry => ({
    id,
    sentAt,
    request: GET_REQUEST,
});

const makeEntry = (overrides: Record<string, unknown> = {}) => ({
    id: 'h1',
    sentAt: 1_000,
    request: makeRequest(),
    response: { status: 200, durationMs: 12, size: 7 },
    ...overrides,
});

describe('historyEntryValidator', () => {
    it.each([
        { name: 'an entry with a response', entry: makeEntry() },
        { name: 'an entry without a response', entry: makeEntry({ response: undefined }) },
    ])('accepts $name', ({ entry }) => {
        expect(validate(historyEntryValidator, entry).ok).toBe(true);
    });

    it.each([
        { name: 'a broken request', entry: makeEntry({ request: makeRequest({ method: 'FETCH' }) }) },
        { name: 'a status out of range', entry: makeEntry({ response: { status: 42, durationMs: 0, size: 0 } }) },
        { name: 'a negative time', entry: makeEntry({ sentAt: -1 }) },
    ])('rejects $name', ({ entry }) => {
        expect(validate(historyEntryValidator, entry).ok).toBe(false);
    });
});

describe('history entries', () => {
    it('keep the status, time and size of a response but not its body', () => {
        const response = { status: 404, statusText: 'Not Found', headers: [], body: 'secret', size: 6, durationMs: 9 };

        expect(mapResponseToSummary(response)).toEqual({ status: 404, durationMs: 9, size: 6 });
    });

    it('sort the newest first', () => {
        const entries = [makeHistoryEntry('old', 1), makeHistoryEntry('new', 2)];

        expect(sortHistoryEntries(entries).map(entry => entry.id)).toEqual(['new', 'old']);
    });
});
