import { describe, expect, it } from '@rstest/core';

import { validate } from '#shared/lib';

import { FEATURES, isFeatureEnabled, readPolicy } from './policy.ts';
import { applySettingsPatch, DEFAULT_SETTINGS, settingsPatchValidator, settingsValidator } from './settings.ts';

describe('settings', () => {
    it('validates stored settings strictly', () => {
        expect(validate(settingsValidator, DEFAULT_SETTINGS).ok).toBe(true);

        expect(validate(settingsValidator, { enabled: true, locale: 'de' }).ok).toBe(false);

        expect(validate(settingsValidator, { enabled: true }).ok).toBe(false);
    });

    it('accepts partial patches but not empty ones', () => {
        expect(validate(settingsPatchValidator, { locale: 'ru' })).toEqual({ ok: true, value: { locale: 'ru' } });

        expect(validate(settingsPatchValidator, {}).ok).toBe(false);

        expect(validate(settingsPatchValidator, { locale: 'ru', admin: true }).ok).toBe(false);
    });

    it('applies a patch without touching other fields', () => {
        expect(applySettingsPatch(DEFAULT_SETTINGS, { locale: 'ru' })).toEqual({ enabled: true, locale: 'ru' });
    });
});

describe('managed policy', () => {
    it('treats a missing policy as no restrictions', () => {
        expect(readPolicy(undefined)).toEqual({ policy: {}, issues: [] });
    });

    it('keeps valid fields', () => {
        const { policy, issues } = readPolicy({ disabledFeatures: ['mocks'], allowedHosts: ['*.corp.example'] });

        expect(issues).toEqual([]);

        expect(isFeatureEnabled(policy, 'mocks')).toBe(false);

        expect(isFeatureEnabled(policy, 'redirect')).toBe(true);

        expect(policy.allowedHosts).toEqual(['*.corp.example']);
    });

    it('fails closed on broken restrictive fields and reports them', () => {
        const { policy, issues } = readPolicy({
            disabledFeatures: 'mocks',
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
