import { describe, expect, it } from '@rstest/core';

import { getPatternHost, SyntaxTypes, urlPattern } from '../urlPattern.ts';
import { validate } from '../validation.ts';

describe('urlPattern', () => {
    it.each([
        { syntaxType: SyntaxTypes.FILTER, value: '||api.example.com/v1/^' },
        { syntaxType: SyntaxTypes.RGX, value: '^https://api\\.example\\.com/' },
    ])('accepts a $syntaxType pattern', pattern => {
        expect(validate(urlPattern, pattern).ok).toBe(true);
    });

    it.each([
        { reason: 'a non-ASCII filter', pattern: { syntaxType: SyntaxTypes.FILTER, value: '||пример.рф' } },
        { reason: 'a broken regex', pattern: { syntaxType: SyntaxTypes.RGX, value: '(' } },
        { reason: 'a filter starting with ||*', pattern: { syntaxType: SyntaxTypes.FILTER, value: '||*.example.com' } },
    ])('rejects $reason', ({ pattern }) => {
        expect(validate(urlPattern, pattern).ok).toBe(false);
    });
});

describe('getPatternHost', () => {
    it.each([
        { value: '||api.example.com/v1/', host: 'api.example.com' },
        { value: '||API.Example.com^', host: 'api.example.com' },
        { value: '||localhost:3000/api', host: 'localhost' },
        { value: '|https://app.example.com/login', host: 'app.example.com' },
        { value: 'http://127.0.0.1:8080/', host: '127.0.0.1' },
    ])('reads $host from $value', ({ value, host }) => {
        expect(getPatternHost({ syntaxType: SyntaxTypes.FILTER, value })).toBe(host);
    });

    it.each([
        { name: 'a filter without a host anchor', value: 'example.com/ads' },
        { name: 'a wildcard in the host', value: '||api.*.example.com/' },
        { name: 'a filter that starts with a wildcard', value: '*://example.com/' },
    ])('finds no host in $name', ({ value }) => {
        expect(getPatternHost({ syntaxType: SyntaxTypes.FILTER, value })).toBeUndefined();
    });

    it('finds no host in a regular expression', () => {
        expect(getPatternHost({ syntaxType: SyntaxTypes.RGX, value: '^https://api\\.example\\.com/' })).toBeUndefined();
    });
});
