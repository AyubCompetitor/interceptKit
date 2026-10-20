import { describe, expect, it } from '@rstest/core';

import { SUPPORTED_LOCALES } from '#shared/config';

import { CATALOGS, type Catalog } from '../translator.ts';

const PLACEHOLDER_RGX = /\$([A-Za-z0-9_@]+\$|[1-9])/g;

const getPlaceholders = (catalog: Catalog): Record<string, string[]> =>
    Object.fromEntries(
        Object.entries(catalog).map(([key, entry]) => [
            key,
            [...entry.message.matchAll(PLACEHOLDER_RGX)].map(([firstMatch]) => firstMatch).toSorted(),
        ]),
    );

describe('message catalogs', () => {
    it.each(SUPPORTED_LOCALES)('%s has the same keys and placeholders as en', locale => {
        expect(Object.keys(CATALOGS[locale]).toSorted()).toEqual(Object.keys(CATALOGS.en).toSorted());

        expect(getPlaceholders(CATALOGS[locale])).toEqual(getPlaceholders(CATALOGS.en));
    });

    it.each(SUPPORTED_LOCALES)('%s fits Chrome Web Store limits for the manifest strings', locale => {
        expect(CATALOGS[locale].extName.message.length).toBeLessThanOrEqual(75);

        expect(CATALOGS[locale].extDescription.message.length).toBeLessThanOrEqual(132);
    });
});
