import { describe, expect, it } from '@rstest/core';

import { getResponseContentType, isErrorStatus, type ApiResponse } from '../apiResponse.ts';

const makeResponse = (overrides: Partial<ApiResponse> = {}): ApiResponse => ({
    status: 200,
    statusText: 'OK',
    headers: [['Content-Type', 'application/json']],
    body: '{}',
    size: 2,
    isTruncated: false,
    durationMs: 10,
    ...overrides,
});

describe('getResponseContentType', () => {
    it('reads the header whatever its case', () => {
        expect(getResponseContentType(makeResponse())).toBe('application/json');
    });

    it('gives an empty type without the header', () => {
        expect(getResponseContentType(makeResponse({ headers: [] }))).toBe('');
    });
});

describe('isErrorStatus', () => {
    it.each([
        { status: 204, isError: false },
        { status: 304, isError: false },
        { status: 404, isError: true },
        { status: 503, isError: true },
    ])('tells whether $status is an error: $isError', ({ status, isError }) => {
        expect(isErrorStatus(status)).toBe(isError);
    });
});
