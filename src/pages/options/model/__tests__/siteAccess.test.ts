import { describe, expect, it } from '@rstest/core';

import { getMissingAccessHost } from '../siteAccess.ts';

import { BLOCK_RULE, CONDITIONS_RULE, SUBSTITUTION_RULE } from './mocks.ts';

const EXAMPLE_SUBDOMAINS = ['*://*.example.com/*'];

const API_ONLY = ['*://api.example.com/*'];

describe('getMissingAccessHost', () => {
    it('names the requested host without access', () => {
        expect(getMissingAccessHost(BLOCK_RULE, [])).toBe('api.example.com');
    });

    it('names an initiator domain without access', () => {
        expect(getMissingAccessHost(CONDITIONS_RULE, API_ONLY)).toBe('app.example.com');
    });

    it.each([
        { name: 'every host is granted', rule: CONDITIONS_RULE, patterns: EXAMPLE_SUBDOMAINS },
        { name: 'the rule is off', rule: { ...BLOCK_RULE, enabled: false }, patterns: [] },
        { name: 'a regex hides the host', rule: SUBSTITUTION_RULE, patterns: [] },
    ])('finds nothing when $name', ({ rule, patterns }) => {
        expect(getMissingAccessHost(rule, patterns)).toBeUndefined();
    });
});
