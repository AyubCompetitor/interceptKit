import { describe, expect, it } from '@rstest/core';

import { SUPPORTED_LOCALES } from '#shared/config';

import { resolveLocale } from './resolveLocale.ts';
import { CATALOGS, createTranslator, type Catalog } from './translator.ts';

const PLACEHOLDER_RGX = /\$([A-Za-z0-9_@]+\$|[1-9])/g;

const getPlaceholders = (catalog: Catalog): Record<string, string[]> =>
    Object.fromEntries(
        Object.entries(catalog).map(([key, entry]) => [
            key,
            [...entry.message.matchAll(PLACEHOLDER_RGX)].map(([firstMatch]) => firstMatch).toSorted(),
        ]),
    );

describe('catalogs', () => {
    it('have the same keys and placeholders in every locale', () => {
        const reference = CATALOGS.en;

        for (const locale of SUPPORTED_LOCALES) {
            expect(Object.keys(CATALOGS[locale]).toSorted()).toEqual(Object.keys(reference).toSorted());

            expect(getPlaceholders(CATALOGS[locale])).toEqual(getPlaceholders(reference));
        }
    });

    it('fit Chrome Web Store limits for the manifest strings', () => {
        for (const locale of SUPPORTED_LOCALES) {
            expect(CATALOGS[locale].extName.message.length).toBeLessThanOrEqual(75);

            expect(CATALOGS[locale].extDescription.message.length).toBeLessThanOrEqual(132);
        }
    });
});

describe('translator', () => {
    it('returns the message of the chosen locale', () => {
        expect(createTranslator('en')('settingsTitle')).toBe('Settings');

        expect(createTranslator('ru')('settingsTitle')).toBe('Настройки');
    });
});

describe('resolveLocale', () => {
    it('prefers an explicit choice', () => {
        expect(resolveLocale('ru', 'en-US')).toBe('ru');
    });

    it('follows a supported browser language in auto mode', () => {
        expect(resolveLocale('auto', 'ru-RU')).toBe('ru');

        expect(resolveLocale('auto', 'en_GB')).toBe('en');
    });

    it('falls back to English for other languages', () => {
        expect(resolveLocale('auto', 'de-DE')).toBe('en');

        expect(resolveLocale('auto', '')).toBe('en');
    });
});
