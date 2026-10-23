import type { Site } from './site.ts';

export const upsertSite = (sites: readonly Site[], site: Site): Site[] => {
    const index = sites.findIndex(current => current.pattern === site.pattern);

    if (index === -1) {
        return [...sites, site];
    }

    return sites.with(index, site);
};

export const getGrantedSites = (sites: readonly Site[], grantedPatterns: readonly string[]): Site[] => {
    return sites.filter(site => grantedPatterns.includes(site.pattern));
};

export const getMockPatterns = (sites: readonly Site[], grantedPatterns: readonly string[]): string[] => {
    const mockSites = getGrantedSites(sites, grantedPatterns).filter(site => site.mocks);

    return mockSites.map(site => site.pattern).toSorted();
};
