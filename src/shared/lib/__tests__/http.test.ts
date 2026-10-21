import { describe, expect, it } from '@rstest/core';

import { headerName, headerValue, httpMethod, HttpMethods, httpMethods, httpUrl } from '../http.ts';
import { validate } from '../validation.ts';

describe('headerName', () => {
    it('accepts a token', () => {
        expect(validate(headerName, 'X-Request-Id').ok).toBe(true);
    });

    it.each(['Bad Header', ''])('rejects "%s"', input => {
        expect(validate(headerName, input).ok).toBe(false);
    });
});

describe('headerValue', () => {
    it('accepts visible characters and spaces', () => {
        expect(validate(headerValue, 'Bearer abc').ok).toBe(true);
    });

    it.each(['a\r\nSet-Cookie: x=1', 'a\nb'])('rejects CR/LF, which would allow header injection: %j', input => {
        expect(validate(headerValue, input).ok).toBe(false);
    });
});

describe('httpUrl', () => {
    it('accepts an absolute https URL', () => {
        expect(validate(httpUrl, 'https://example.com/a?b=1').ok).toBe(true);
    });

    it.each([
        // oxlint-disable-next-line no-script-url -- the test proves such URLs are rejected
        'javascript:alert(1)',
        'data:text/plain,hi',
        '/relative',
    ])('rejects %s', input => {
        expect(validate(httpUrl, input).ok).toBe(false);
    });
});

describe('httpMethod', () => {
    it.each([
        { input: 'PATCH', expected: true },
        { input: 'patch', expected: false },
    ])('$input -> $expected', ({ input, expected }) => {
        expect(validate(httpMethod, input).ok).toBe(expected);
    });
});

describe('httpMethods', () => {
    it('accepts a list of known methods', () => {
        expect(validate(httpMethods, [HttpMethods.GET, HttpMethods.POST]).ok).toBe(true);
    });

    it('rejects an empty list, which DNR does not accept', () => {
        expect(validate(httpMethods, []).ok).toBe(false);
    });
});
