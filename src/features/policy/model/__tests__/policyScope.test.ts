import { describe, expect, it } from '@rstest/core';

import { Features } from '#entities/config';
import { Sources } from '#shared/lib';

import {
    getDisabledRuleFeatures,
    isMockAllowed,
    isPolicyOnly,
    isRuleAllowed,
    isVaultRequired,
} from '../policyScope.ts';
import { makeMock, makeRule } from './mocks.ts';

const POLICY_RULE = makeRule(Sources.POLICY);

const POLICY_MOCK = makeMock(Sources.POLICY);

describe('isVaultRequired', () => {
    it.each([
        { name: 'no policy', policy: {}, expected: false },
        { name: 'the vault not required', policy: { requireVault: false }, expected: false },
        { name: 'the vault required', policy: { requireVault: true }, expected: true },
    ])('$name', ({ policy, expected }) => {
        expect(isVaultRequired(policy)).toBe(expected);
    });
});

describe('isPolicyOnly', () => {
    it.each([
        { name: 'no policy', policy: {}, expected: false },
        { name: 'user rules allowed', policy: { allowUserRules: true }, expected: false },
        { name: 'user rules forbidden', policy: { allowUserRules: false }, expected: true },
    ])('$name', ({ policy, expected }) => {
        expect(isPolicyOnly(policy)).toBe(expected);
    });
});

describe('isRuleAllowed', () => {
    it('lets every rule apply without a policy', () => {
        expect(isRuleAllowed(makeRule(), {})).toBe(true);
    });

    it('keeps out a rule of a turned-off feature, whoever made it', () => {
        const policy = { disabledFeatures: [Features.BLOCK] };

        expect(isRuleAllowed(makeRule(), policy)).toBe(false);

        expect(isRuleAllowed(POLICY_RULE, policy)).toBe(false);
    });

    it('keeps out only the user rules when the policy allows its own alone', () => {
        const policy = { allowUserRules: false };

        expect(isRuleAllowed(makeRule(), policy)).toBe(false);

        expect(isRuleAllowed(POLICY_RULE, policy)).toBe(true);
    });
});

describe('isMockAllowed', () => {
    it('lets every mock apply without a policy', () => {
        expect(isMockAllowed(makeMock(), {})).toBe(true);
    });

    it('keeps out every mock when the policy turns mocks off', () => {
        const policy = { disabledFeatures: [Features.MOCKS] };

        expect(isMockAllowed(makeMock(), policy)).toBe(false);

        expect(isMockAllowed(POLICY_MOCK, policy)).toBe(false);
    });

    it('keeps out only the user mocks when the policy allows its own alone', () => {
        const policy = { allowUserRules: false };

        expect(isMockAllowed(makeMock(), policy)).toBe(false);

        expect(isMockAllowed(POLICY_MOCK, policy)).toBe(true);
    });
});

describe('getDisabledRuleFeatures', () => {
    it('names the turned-off features of rules only, in the order of rule types', () => {
        const policy = { disabledFeatures: [Features.MOCKS, Features.BLOCK, Features.REDIRECT] };

        expect(getDisabledRuleFeatures(policy)).toEqual([Features.REDIRECT, Features.BLOCK]);
    });

    it('is empty without a policy', () => {
        expect(getDisabledRuleFeatures({})).toEqual([]);
    });
});
