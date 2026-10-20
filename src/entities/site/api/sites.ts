import { sitesValidator, type Site } from '../model/site.ts';

import { defineStoreItem, Stores } from '#shared/lib';

export const sitesItem = defineStoreItem<readonly Site[]>({
    key: 'sites',
    area: Stores.LOCAL,
    fallback: [],
    validator: sitesValidator,
});
