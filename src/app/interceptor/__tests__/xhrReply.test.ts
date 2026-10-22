import { describe, expect, it } from '@rstest/core';

import { buildXhrResponse, formatXhrHeaders, isTextResponseType } from '../xhrReply.ts';

const JSON_BODY = '{"ok":true}';

const JSON_TYPE = 'application/json';

describe('buildXhrResponse', () => {
    it.each([
        { responseType: '' as const, response: JSON_BODY },
        { responseType: 'text' as const, response: JSON_BODY },
        { responseType: 'json' as const, response: { ok: true } },
        { responseType: 'document' as const, response: null },
    ])('gives responseType "$responseType" its value', ({ responseType, response }) => {
        expect(buildXhrResponse(JSON_BODY, responseType, JSON_TYPE)).toEqual(response);
    });

    it('gives null for a JSON body that does not parse', () => {
        expect(buildXhrResponse('{', 'json', JSON_TYPE)).toBeNull();
    });

    it('gives the body as bytes for responseType arraybuffer', () => {
        const response = buildXhrResponse('hi', 'arraybuffer', null);
        const isArrayBuffer = response instanceof ArrayBuffer;

        expect(isArrayBuffer).toBe(true);

        expect(isArrayBuffer && new TextDecoder().decode(response)).toBe('hi');
    });

    it('gives a blob of the content type for responseType blob', async () => {
        const response = buildXhrResponse(JSON_BODY, 'blob', JSON_TYPE);
        const isBlob = response instanceof Blob;

        expect(isBlob && response.type).toBe(JSON_TYPE);

        expect(isBlob && (await response.text())).toBe(JSON_BODY);
    });
});

describe('isTextResponseType', () => {
    it.each([
        { responseType: '' as const, isText: true },
        { responseType: 'text' as const, isText: true },
        { responseType: 'json' as const, isText: false },
    ])('tells whether "$responseType" is text: $isText', ({ responseType, isText }) => {
        expect(isTextResponseType(responseType)).toBe(isText);
    });
});

describe('formatXhrHeaders', () => {
    it('writes one header per line, as getAllResponseHeaders does', () => {
        const headers: [string, string][] = [
            ['content-type', JSON_TYPE],
            ['x-mocked', 'yes'],
        ];

        expect(formatXhrHeaders(headers)).toBe('content-type: application/json\r\nx-mocked: yes\r\n');
    });
});
