import type { ApiResponse } from '#entities/request';
import type { KeyValueRow } from '#shared/lib';

import { createRequestDraft, type RequestDraft } from '../requestDraft.ts';

export const makeRow = (key: string, value: string, enabled = true): KeyValueRow => ({
    rowId: key,
    key,
    value,
    enabled,
});

/** A new request tab with the fields given */
export const makeDraft = (overrides: Partial<RequestDraft> = {}): RequestDraft => ({
    ...createRequestDraft(),
    ...overrides,
});

/** A JSON 200 response unless overridden */
export const makeResponse = (overrides: Partial<ApiResponse> = {}): ApiResponse => ({
    status: 200,
    statusText: 'OK',
    headers: [['content-type', 'application/json']],
    body: '{"a":1}',
    size: 7,
    durationMs: 12,
    ...overrides,
});
