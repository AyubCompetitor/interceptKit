import { siteValidator, sitesValidator, type Site } from '../model/site.ts';

import { defineMethod, defineStoreItem, Stores } from '#shared/lib';

export const sitesItem = defineStoreItem<readonly Site[]>({
    key: 'sites',
    area: Stores.LOCAL,
    fallback: [],
    validator: sitesValidator,
});

/** Sites are written only by the background, which checks that the browser granted the pattern */
export const sitesRpc = {
    setMocks: defineMethod<Site, Site>('sites/setMocks', siteValidator),
} as const;
