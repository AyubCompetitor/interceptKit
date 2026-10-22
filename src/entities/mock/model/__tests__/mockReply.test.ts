import { describe, expect, it } from '@rstest/core';

import { MockBodyTypes } from '../mock.ts';
import { buildMockHeaders, getMockHeader } from '../mockReply.ts';

import { makeResponse } from './mocks.ts';

const makeHeader = (key: string, value: string, enabled = true) => ({ key, value, enabled });

describe('buildMockHeaders', () => {
    it.each([
        { bodyType: MockBodyTypes.JSON, contentType: 'application/json' },
        { bodyType: MockBodyTypes.TEXT, contentType: 'text/plain;charset=UTF-8' },
    ])('gives a $bodyType body its content type', ({ bodyType, contentType }) => {
        expect(buildMockHeaders(makeResponse({ bodyType }))).toEqual([['content-type', contentType]]);
    });

    it('keeps the content type the mock sets', () => {
        const response = makeResponse({ headers: [makeHeader('Content-Type', 'application/problem+json')] });

        expect(buildMockHeaders(response)).toEqual([['content-type', 'application/problem+json']]);
    });

    it('adds no content type to an empty body', () => {
        expect(buildMockHeaders(makeResponse({ status: 204, body: '' }))).toEqual([]);
    });

    it('leaves out disabled headers and cookies the page never sees', () => {
        const headers = [
            makeHeader('X-Draft', '1', false),
            makeHeader('Set-Cookie', 'id=1'),
            makeHeader('X-Mocked', 'yes'),
        ];

        expect(buildMockHeaders(makeResponse({ headers, body: '' }))).toEqual([['x-mocked', 'yes']]);
    });
});

describe('getMockHeader', () => {
    const HEADERS: [string, string][] = [
        ['x-tag', 'a'],
        ['content-type', 'application/json'],
        ['x-tag', 'b'],
    ];

    it('finds a header in any letter case', () => {
        expect(getMockHeader(HEADERS, 'Content-Type')).toBe('application/json');
    });

    it('joins repeated headers', () => {
        expect(getMockHeader(HEADERS, 'x-tag')).toBe('a, b');
    });

    it('gives null for a missing header, like the browser', () => {
        expect(getMockHeader(HEADERS, 'x-missing')).toBeNull();
    });
});
