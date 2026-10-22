import { describe, expect, it } from '@rstest/core';

import { buildUrlPatternRgx, getPatternHost, SyntaxTypes, urlPattern } from '../urlPattern.ts';
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

const isFilterMatched = (value: string, url: string) =>
    buildUrlPatternRgx({ syntaxType: SyntaxTypes.FILTER, value }).test(url);

describe('buildUrlPatternRgx', () => {
    it.each([
        {
            name: 'a plain filter anywhere in the URL',
            value: '/api/users',
            url: 'https://example.com/v1/api/users?page=2',
        },
        {
            name: 'the host after a domain anchor',
            value: '||api.example.com/users',
            url: 'https://api.example.com/users/1',
        },
        { name: 'a subdomain after a domain anchor', value: '||example.com/', url: 'http://api.example.com/' },
        { name: 'the start after a left anchor', value: '|https://example.com/', url: 'https://example.com/login' },
        { name: 'the end after a right anchor', value: '/api/old|', url: 'http://127.0.0.1:8080/api/old' },
        { name: 'a port after a separator', value: '||example.com^', url: 'https://example.com:8443/' },
        { name: 'the end of the URL as a separator', value: '||example.com^', url: 'https://example.com' },
        { name: 'anything for a wildcard', value: '/api/*/items', url: 'https://example.com/api/v2/items' },
        { name: 'any letter case', value: '/API/Users', url: 'https://example.com/api/users' },
        { name: 'a query with special characters', value: '/search?q=a+b', url: 'https://example.com/search?q=a+b' },
    ])('matches $name', ({ value, url }) => {
        expect(isFilterMatched(value, url)).toBe(true);
    });

    it.each([
        {
            name: 'a host that only ends like the anchored one',
            value: '||api.example.com',
            url: 'https://myapi.example.com/',
        },
        {
            name: 'the anchored host in the query',
            value: '||api.example.com/',
            url: 'https://x.test/?to=api.example.com/',
        },
        { name: 'a longer host after a separator', value: '||example.com^', url: 'https://example.com.evil.test/' },
        { name: 'a path that goes on after a right anchor', value: '/api/old|', url: 'https://example.com/api/old/1' },
        { name: 'another scheme after a left anchor', value: '|https://example.com/', url: 'http://example.com/' },
        { name: 'any character for a dot', value: '/a.b', url: 'https://example.com/aXb' },
    ])('does not match $name', ({ value, url }) => {
        expect(isFilterMatched(value, url)).toBe(false);
    });

    it('runs a regex pattern as is, in any letter case', () => {
        const rgx = buildUrlPatternRgx({ syntaxType: SyntaxTypes.RGX, value: '^https://api\\.example\\.com/v\\d+/' });

        expect(rgx.test('HTTPS://API.EXAMPLE.COM/v2/users')).toBe(true);

        expect(rgx.test('https://api.example.com/latest/users')).toBe(false);
    });
});
