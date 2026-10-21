import { describe, expect, it } from '@rstest/core';

import { Features, FEATURES, isFeatureEnabled, readPolicy } from '../policy.ts';

describe('readPolicy', () => {
    it('treats a missing policy as no restrictions', () => {
        expect(readPolicy(undefined)).toEqual({ policy: {}, issues: [] });
    });

    it('keeps valid fields', () => {
        const { policy, issues } = readPolicy({ disabledFeatures: [Features.MOCKS], allowedHosts: ['*.corp.example'] });

        expect(issues).toEqual([]);

        expect(policy).toEqual({ disabledFeatures: [Features.MOCKS], allowedHosts: ['*.corp.example'] });
    });

    it('fails closed on broken restrictive fields and reports them', () => {
        const { policy, issues } = readPolicy({
            disabledFeatures: Features.MOCKS,
            allowedHosts: ['https://bad'],
            allowUserRules: 'yes',
            requireVault: 0,
        });

        expect(policy).toEqual({
            disabledFeatures: FEATURES,
            allowedHosts: [],
            allowUserRules: false,
            requireVault: true,
        });

        expect(issues.length).toBe(4);
    });

    it('ignores unknown keys but reports them', () => {
        const { policy, issues } = readPolicy({ allowEverything: true });

        expect(policy).toEqual({});

        expect(issues).toEqual([{ path: '$.allowEverything', message: 'unknown policy, ignored' }]);
    });
});

describe('isFeatureEnabled', () => {
    const { policy } = readPolicy({ disabledFeatures: [Features.MOCKS] });

    it.each([
        { feature: Features.MOCKS, expected: false },
        { feature: Features.REDIRECT, expected: true },
    ] as const)('$feature -> $expected', ({ feature, expected }) => {
        expect(isFeatureEnabled(policy, feature)).toBe(expected);
    });
});
