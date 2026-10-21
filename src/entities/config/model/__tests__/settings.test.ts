import { describe, expect, it } from '@rstest/core';

import { Locales } from '#shared/config';
import { validate } from '#shared/lib';

import {
    applySettingsPatch,
    DEFAULT_SETTINGS,
    isLocalePreference,
    resolveTheme,
    settingsPatchValidator,
    settingsValidator,
    Themes,
} from '../settings.ts';

const RUSSIAN_PATCH = { locale: Locales.ru };

describe('settingsValidator', () => {
    it.each([
        { name: 'the defaults', settings: DEFAULT_SETTINGS },
        { name: 'settings saved before themes existed', settings: { enabled: true, locale: Locales.ru } },
    ])('accepts $name', ({ settings }) => {
        expect(validate(settingsValidator, settings).ok).toBe(true);
    });

    it.each([
        { name: 'an unsupported locale', settings: { enabled: true, locale: 'de' } },
        { name: 'an unknown theme', settings: { enabled: true, locale: 'auto', theme: 'sepia' } },
        { name: 'a missing field', settings: { enabled: true } },
    ])('rejects $name', ({ settings }) => {
        expect(validate(settingsValidator, settings).ok).toBe(false);
    });
});

describe('settingsPatchValidator', () => {
    it('accepts a partial patch', () => {
        expect(validate(settingsPatchValidator, RUSSIAN_PATCH)).toEqual({ ok: true, value: RUSSIAN_PATCH });
    });

    it.each([
        { name: 'an empty patch', patch: {} },
        { name: 'an unknown field', patch: { locale: Locales.ru, admin: true } },
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

describe('resolveTheme', () => {
    it('keeps the chosen theme', () => {
        expect(resolveTheme({ ...DEFAULT_SETTINGS, theme: Themes.LIGHT })).toBe(Themes.LIGHT);
    });

    it('falls back to dark for settings saved before themes existed', () => {
        expect(resolveTheme({ enabled: true, locale: 'auto' })).toBe(Themes.DARK);
    });
});

describe('applySettingsPatch', () => {
    it('changes only the patched fields', () => {
        expect(applySettingsPatch(DEFAULT_SETTINGS, RUSSIAN_PATCH)).toEqual({ ...DEFAULT_SETTINGS, ...RUSSIAN_PATCH });
    });
});
