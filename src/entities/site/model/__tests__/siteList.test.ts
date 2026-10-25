import { describe, expect, it } from '@rstest/core';

import { MAX_SITES } from '../site.ts';
import { getGrantedSites, getMockPatterns, setSiteMocks, upsertSite } from '../siteList.ts';

import { EXAMPLE_PATTERN, makeSite, OTHER_PATTERN } from './mocks.ts';

const EXAMPLE_SITE = makeSite();

const OTHER_SITE = makeSite({ pattern: OTHER_PATTERN });

describe('upsertSite', () => {
    it('adds a site with a new pattern', () => {
        expect(upsertSite([EXAMPLE_SITE], OTHER_SITE)).toEqual([EXAMPLE_SITE, OTHER_SITE]);
    });

    it('replaces the site with the same pattern in place', () => {
        const switchedOff = makeSite({ mocks: false });

        expect(upsertSite([EXAMPLE_SITE, OTHER_SITE], switchedOff)).toEqual([switchedOff, OTHER_SITE]);
    });
});

describe('setSiteMocks', () => {
    it('keeps the settings of sites the browser no longer grants', () => {
        expect(setSiteMocks([EXAMPLE_SITE], OTHER_SITE, [OTHER_PATTERN])).toEqual([EXAMPLE_SITE, OTHER_SITE]);
    });

    it('makes room in a full list with the settings of sites without access', () => {
        const oldSites = Array.from({ length: MAX_SITES }, (_, idx) => makeSite({ pattern: `*://old-${idx}.test/*` }));

        expect(setSiteMocks(oldSites, OTHER_SITE, [OTHER_PATTERN])).toEqual([OTHER_SITE]);
    });
});

describe('getGrantedSites', () => {
    it('drops sites the browser no longer grants', () => {
        expect(getGrantedSites([EXAMPLE_SITE, OTHER_SITE], [OTHER_PATTERN])).toEqual([OTHER_SITE]);
    });
});

describe('getMockPatterns', () => {
    it('gives the sorted patterns of granted sites with mocks on', () => {
        const sites = [OTHER_SITE, EXAMPLE_SITE];

        expect(getMockPatterns(sites, [EXAMPLE_PATTERN, OTHER_PATTERN])).toEqual([EXAMPLE_PATTERN, OTHER_PATTERN]);
    });

    it.each([
        { name: 'a site with mocks off', sites: [makeSite({ mocks: false })], granted: [EXAMPLE_PATTERN] },
        { name: 'a site that is no longer granted', sites: [EXAMPLE_SITE], granted: [OTHER_PATTERN] },
    ])('leaves out $name', ({ sites, granted }) => {
        expect(getMockPatterns(sites, granted)).toEqual([]);
    });
});
