import { HttpMethods, Sources, SyntaxTypes } from '#shared/lib';

import { MockBodyTypes, type Mock, type MockResponse } from '../mock.ts';
import type { PageMock } from '../pageMock.ts';

export const USERS_URL = 'https://api.example.com/users';

export const makeMockResponse = (overrides: Record<string, unknown> = {}) => ({
    status: 200,
    headers: [],
    bodyType: MockBodyTypes.JSON,
    body: '{"ok":true}',
    delayMs: 0,
    ...overrides,
});

/** Raw mock as it comes from storage or an import; overrides apply to its response */
export const makeMock = (responseOverrides: Record<string, unknown> = {}) => ({
    id: 'm1',
    name: 'Users',
    enabled: true,
    source: Sources.USER,
    match: { url: { syntaxType: SyntaxTypes.FILTER, value: '||api.example.com/users' }, methods: [HttpMethods.GET] },
    response: makeMockResponse(responseOverrides),
});

export const makeResponse = (overrides: Partial<MockResponse> = {}): MockResponse => ({
    status: 200,
    headers: [],
    bodyType: MockBodyTypes.JSON,
    body: '{"ok":true}',
    delayMs: 0,
    ...overrides,
});

export const makePageMock = (overrides: Partial<PageMock> = {}): PageMock => ({
    match: { url: { syntaxType: SyntaxTypes.FILTER, value: '||api.example.com/users' } },
    response: makeResponse(),
    ...overrides,
});

/** A mock that has passed validation */
export const makeCheckedMock = (overrides: Partial<Mock> = {}): Mock => ({
    id: 'm1',
    name: 'Users',
    enabled: true,
    source: Sources.USER,
    match: { url: { syntaxType: SyntaxTypes.FILTER, value: '||api.example.com/users' } },
    response: makeResponse(),
    ...overrides,
});
