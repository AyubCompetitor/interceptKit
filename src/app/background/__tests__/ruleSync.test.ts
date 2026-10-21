import { describe, expect, it } from '@rstest/core';

import { DEFAULT_SETTINGS, Features } from '#entities/config';
import { RuleTargetTypes, RuleTypes, type Rule } from '#entities/rule';
import { Sources, SyntaxTypes } from '#shared/lib';

import { selectActiveRules } from '../ruleSync.ts';

const MATCH = {
    url: {
        syntaxType: SyntaxTypes.FILTER,
        value: '||example.com^',
    },
} as const;

const BLOCK_RULE: Rule = {
    id: 'block-rule',
    name: 'Block',
    enabled: true,
    source: Sources.USER,
    type: RuleTypes.BLOCK,
    match: MATCH,
};

const REDIRECT_RULE: Rule = {
    id: 'redirect-rule',
    name: 'Redirect',
    enabled: true,
    source: Sources.USER,
    type: RuleTypes.REDIRECT,
    match: MATCH,
    to: {
        targetType: RuleTargetTypes.URL,
        url: 'https://staging.example.com/',
    },
};

const RULES = [BLOCK_RULE, REDIRECT_RULE];

const REDIRECTS_OFF = { disabledFeatures: [Features.REDIRECT] };

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
        expect(selectActiveRules(RULES, DEFAULT_SETTINGS, REDIRECTS_OFF)).toEqual([BLOCK_RULE]);
    });

    it('skips user rules when the policy allows only its own', () => {
        expect(selectActiveRules(RULES, DEFAULT_SETTINGS, { allowUserRules: false })).toEqual([]);
    });
});
