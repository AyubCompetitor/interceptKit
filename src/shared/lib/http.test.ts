import { describe, expect, it } from '@rstest/core';

import { headerName, headerValue, httpMethod, httpUrl } from './http.ts';
import { urlPattern } from './urlPattern.ts';
import { validate } from './validation.ts';

describe('http vocabulary', () => {
    it('accepts token header names only', () => {
        expect(validate(headerName, 'X-Request-Id').ok).toBe(true);

        expect(validate(headerName, 'Bad Header').ok).toBe(false);

        expect(validate(headerName, '').ok).toBe(false);
    });

    it('rejects CR/LF in header values (header injection)', () => {
        expect(validate(headerValue, 'Bearer abc').ok).toBe(true);

        expect(validate(headerValue, 'a\r\nSet-Cookie: x=1').ok).toBe(false);

        expect(validate(headerValue, 'a\nb').ok).toBe(false);
    });

    it('accepts only absolute http(s) URLs', () => {
        expect(validate(httpUrl, 'https://example.com/a?b=1').ok).toBe(true);

        // oxlint-disable-next-line no-script-url -- the test proves such URLs are rejected
        expect(validate(httpUrl, 'javascript:alert(1)').ok).toBe(false);

        expect(validate(httpUrl, 'data:text/plain,hi').ok).toBe(false);

        expect(validate(httpUrl, '/relative').ok).toBe(false);
    });

    it('knows the supported methods', () => {
        expect(validate(httpMethod, 'PATCH').ok).toBe(true);

        expect(validate(httpMethod, 'patch').ok).toBe(false);
    });
});

describe('urlPattern', () => {
    it('accepts ASCII url filters and valid regexes', () => {
        expect(validate(urlPattern, { kind: 'filter', value: '||api.example.com/v1/^' }).ok).toBe(true);

        expect(validate(urlPattern, { kind: 'regex', value: '^https://api\\.example\\.com/' }).ok).toBe(true);
    });

    it('rejects non-ASCII filters and broken regexes', () => {
        expect(validate(urlPattern, { kind: 'filter', value: '||пример.рф' }).ok).toBe(false);

        expect(validate(urlPattern, { kind: 'regex', value: '(' }).ok).toBe(false);
    });
});
