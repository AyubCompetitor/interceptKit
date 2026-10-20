import { describe, expect, it } from '@rstest/core';

import { validate } from '#shared/lib';

import {
    applySettingsPatch,
    DEFAULT_SETTINGS,
    isLocalePreference,
    settingsPatchValidator,
    settingsValidator,
} from '../settings.ts';

describe('settingsValidator', () => {
    it('accepts the defaults', () => {
        expect(validate(settingsValidator, DEFAULT_SETTINGS).ok).toBe(true);
    });

    it.each([
        { name: 'an unsupported locale', settings: { enabled: true, locale: 'de' } },
        { name: 'a missing field', settings: { enabled: true } },
    ])('rejects $name', ({ settings }) => {
        expect(validate(settingsValidator, settings).ok).toBe(false);
    });
});

describe('settingsPatchValidator', () => {
    it('accepts a partial patch', () => {
        expect(validate(settingsPatchValidator, { locale: 'ru' })).toEqual({ ok: true, value: { locale: 'ru' } });
    });

    it.each([
        { name: 'an empty patch', patch: {} },
        { name: 'an unknown field', patch: { locale: 'ru', admin: true } },
    ])('rejects $name', ({ patch }) => {
        expect(validate(settingsPatchValidator, patch).ok).toBe(false);
    });
});

describe('isLocalePreference', () => {
    it.each([
        { value: 'auto', expected: true },
        { value: 'ru', expected: true },
        { value: 'de', expected: false },
    ])('$value -> $expected', ({ value, expected }) => {
        expect(isLocalePreference(value)).toBe(expected);
    });
});

describe('applySettingsPatch', () => {
    it('changes only the patched fields', () => {
        expect(applySettingsPatch(DEFAULT_SETTINGS, { locale: 'ru' })).toEqual({ enabled: true, locale: 'ru' });
    });
});
