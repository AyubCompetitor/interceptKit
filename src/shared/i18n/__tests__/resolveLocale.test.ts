import { describe, expect, it } from '@rstest/core';

import { Locales } from '#shared/config';

import { resolveLocale } from '../resolveLocale.ts';

describe('resolveLocale', () => {
    it('prefers an explicit choice over the browser language', () => {
        expect(resolveLocale(Locales.ru, 'en-US')).toBe(Locales.ru);
    });

    it.each([
        { uiLanguage: 'ru-RU', expected: Locales.ru },
        { uiLanguage: 'en_GB', expected: Locales.en },
    ])('follows a supported browser language in auto mode: $uiLanguage -> $expected', ({ uiLanguage, expected }) => {
        expect(resolveLocale('auto', uiLanguage)).toBe(expected);
    });

    it.each(['de-DE', ''])('falls back to English for "%s"', uiLanguage => {
        expect(resolveLocale('auto', uiLanguage)).toBe(Locales.en);
    });
});
