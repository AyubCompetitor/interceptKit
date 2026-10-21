import { describe, expect, it } from '@rstest/core';

import { buildHostPattern, formatHostPattern, isHostCovered, parseHost, parseHostPattern } from '../hostAccess.ts';

describe('parseHost', () => {
    it.each([
        { input: 'example.com', host: 'example.com' },
        { input: '  Example.COM ', host: 'example.com' },
        { input: 'https://app.example.com/login?next=1', host: 'app.example.com' },
        { input: 'localhost:3000', host: 'localhost' },
        { input: '127.0.0.1:8080', host: '127.0.0.1' },
        { input: 'пример.рф', host: 'xn--e1afmkfd.xn--p1ai' },
    ])('reads $input as $host', ({ input, host }) => {
        expect(parseHost(input)).toBe(host);
    });

    it.each([
        { name: 'an empty input', input: '' },
        { name: 'text with spaces', input: 'not a domain' },
        { name: 'a wildcard', input: '*.example.com' },
        { name: 'a URL without a host', input: 'file:///C:/notes.txt' },
    ])('rejects $name', ({ input }) => {
        expect(parseHost(input)).toBeUndefined();
    });
});

describe('buildHostPattern', () => {
    it('covers http and https on the host only', () => {
        expect(buildHostPattern('example.com', false)).toBe('*://example.com/*');
    });

    it('adds subdomains with a wildcard', () => {
        expect(buildHostPattern('example.com', true)).toBe('*://*.example.com/*');
    });
});

describe('formatHostPattern', () => {
    it.each([
        { pattern: '*://*.example.com/*', label: '*.example.com' },
        { pattern: '*://localhost/*', label: 'localhost' },
        { pattern: 'https://example.com/*', label: 'https://example.com' },
    ])('shows $pattern as $label', ({ pattern, label }) => {
        expect(formatHostPattern(pattern)).toBe(label);
    });
});

describe('parseHostPattern', () => {
    it.each([
        { pattern: '*://*.example.com/*', grant: { host: 'example.com', isWithSubdomains: true } },
        { pattern: '*://localhost/*', grant: { host: 'localhost', isWithSubdomains: false } },
    ])('reads $pattern', ({ pattern, grant }) => {
        expect(parseHostPattern(pattern)).toEqual(grant);
    });

    it.each([
        { name: 'all sites', pattern: '*://*/*' },
        { name: 'a single scheme', pattern: 'https://example.com/*' },
        { name: 'a single path', pattern: '*://example.com/api/*' },
    ])('leaves $name to the caller', ({ pattern }) => {
        expect(parseHostPattern(pattern)).toBeUndefined();
    });
});

describe('isHostCovered', () => {
    it.each([
        { name: 'the domain of a subdomain pattern', host: 'example.com', patterns: ['*://*.example.com/*'] },
        { name: 'a subdomain', host: 'api.example.com', patterns: ['*://*.example.com/*'] },
        { name: 'the exact host', host: 'example.com', patterns: ['*://example.com/*'] },
        { name: 'any host under all sites', host: 'example.org', patterns: ['*://*/*'] },
        { name: 'a host with a port in the pattern', host: 'localhost', patterns: ['http://localhost:3000/*'] },
    ])('covers $name', ({ host, patterns }) => {
        expect(isHostCovered(host, patterns)).toBe(true);
    });

    it.each([
        { name: 'a subdomain of an exact host', host: 'api.example.com', patterns: ['*://example.com/*'] },
        { name: 'a lookalike domain', host: 'badexample.com', patterns: ['*://*.example.com/*'] },
        { name: 'any host without grants', host: 'example.com', patterns: [] },
    ])('does not cover $name', ({ host, patterns }) => {
        expect(isHostCovered(host, patterns)).toBe(false);
    });
});
