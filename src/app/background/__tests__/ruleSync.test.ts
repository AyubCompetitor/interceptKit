import { describe, expect, it } from '@rstest/core';

import { DEFAULT_SETTINGS } from '#entities/config';
import type { Rule } from '#entities/rule';

import { selectActiveRules } from '../ruleSync.ts';

const MATCH = {
    url: {
        syntaxType: 'filter',
        value: '||example.com^',
    },
} as const;

const BLOCK_RULE: Rule = {
    id: 'block',
    name: 'Block',
    enabled: true,
    source: 'user',
    type: 'block',
    match: MATCH,
};

const REDIRECT_RULE: Rule = {
    id: 'redirect',
    name: 'Redirect',
    enabled: true,
    source: 'user',
    type: 'redirect',
    match: MATCH,
    to: {
        targetType: 'url',
        url: 'https://staging.example.com/',
    },
};

const RULES = [BLOCK_RULE, REDIRECT_RULE];

describe('selectActiveRules', () => {
    it('keeps enabled rules in their order', () => {
        expect(selectActiveRules(RULES, DEFAULT_SETTINGS, {})).toEqual(RULES);
    });

    it('drops everything when interception is switched off', () => {
        expect(selectActiveRules(RULES, { ...DEFAULT_SETTINGS, enabled: false }, {})).toEqual([]);
    });

    it('skips disabled rules', () => {
        const disabledBlock = { ...BLOCK_RULE, enabled: false };

        expect(selectActiveRules([disabledBlock, REDIRECT_RULE], DEFAULT_SETTINGS, {})).toEqual([REDIRECT_RULE]);
    });

    it('skips rules of a feature the policy disables', () => {
        expect(selectActiveRules(RULES, DEFAULT_SETTINGS, { disabledFeatures: ['redirect'] })).toEqual([BLOCK_RULE]);
    });

    it('skips user rules when the policy allows only its own', () => {
        expect(selectActiveRules(RULES, DEFAULT_SETTINGS, { allowUserRules: false })).toEqual([]);
    });
});
