import { describe, expect, it } from '@rstest/core';

import { getAllowedHostPattern, getDisallowedPatterns, isHostAllowed, isPatternAllowed } from '../policyHosts.ts';

const EXAMPLE_ONLY = { allowedHosts: ['example.com'] };

const EXAMPLE_SUBDOMAINS = { allowedHosts: ['*.example.com'] };

const NO_HOSTS = { allowedHosts: [] };

describe('isHostAllowed', () => {
    it.each([
        { name: 'any host without the list', host: 'bank.test', policy: {}, expected: true },
        { name: 'the host of an exact entry', host: 'example.com', policy: EXAMPLE_ONLY, expected: true },
        { name: 'a subdomain of an exact entry', host: 'api.example.com', policy: EXAMPLE_ONLY, expected: false },
        { name: 'the domain of a subdomain entry', host: 'example.com', policy: EXAMPLE_SUBDOMAINS, expected: true },
        { name: 'a deep subdomain', host: 'a.b.example.com', policy: EXAMPLE_SUBDOMAINS, expected: true },
        { name: 'a lookalike domain', host: 'badexample.com', policy: EXAMPLE_SUBDOMAINS, expected: false },
        { name: 'any host with an empty list', host: 'example.com', policy: NO_HOSTS, expected: false },
    ])('$name: $expected', ({ host, policy, expected }) => {
        expect(isHostAllowed(host, policy)).toBe(expected);
    });
});

describe('isPatternAllowed', () => {
    it.each([
        { name: 'the host alone, exact entry', pattern: '*://example.com/*', policy: EXAMPLE_ONLY, expected: true },
        { name: 'a port of the host', pattern: 'http://example.com:8080/*', policy: EXAMPLE_ONLY, expected: true },
        { name: 'subdomains, exact entry', pattern: '*://*.example.com/*', policy: EXAMPLE_ONLY, expected: false },
        {
            name: 'subdomains, subdomain entry',
            pattern: '*://*.example.com/*',
            policy: EXAMPLE_SUBDOMAINS,
            expected: true,
        },
        { name: 'deeper subdomains', pattern: '*://*.api.example.com/*', policy: EXAMPLE_SUBDOMAINS, expected: true },
        { name: 'every site', pattern: '*://*/*', policy: EXAMPLE_SUBDOMAINS, expected: false },
        { name: 'every URL', pattern: '<all_urls>', policy: EXAMPLE_SUBDOMAINS, expected: false },
        { name: 'every site without the list', pattern: '*://*/*', policy: {}, expected: true },
    ])('$name: $expected', ({ pattern, policy, expected }) => {
        expect(isPatternAllowed(pattern, policy)).toBe(expected);
    });
});

describe('getDisallowedPatterns', () => {
    it('names the granted patterns outside the list', () => {
        const patterns = ['*://*.example.com/*', '*://example.com/*', '*://bank.test/*'];

        expect(getDisallowedPatterns(patterns, EXAMPLE_ONLY)).toEqual(['*://*.example.com/*', '*://bank.test/*']);
    });
});

describe('getAllowedHostPattern', () => {
    it.each([
        { name: 'subdomains when the list allows them', policy: EXAMPLE_SUBDOMAINS, expected: '*://*.example.com/*' },
        { name: 'the host alone for an exact entry', policy: EXAMPLE_ONLY, expected: '*://example.com/*' },
        { name: 'nothing for a host outside the list', policy: NO_HOSTS, expected: undefined },
    ])('gives $name', ({ policy, expected }) => {
        expect(getAllowedHostPattern('example.com', policy)).toBe(expected);
    });
});
