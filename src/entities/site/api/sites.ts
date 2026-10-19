import { sitesValidator, type Site } from '../model/site.ts';

import { defineStore, Stores } from '#shared/lib';

export const sitesItem = defineStore<readonly Site[]>({
    key: 'sites',
    area: Stores.LOCAL,
    fallback: [],
    validator: sitesValidator,
});
