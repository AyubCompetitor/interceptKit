import { rulesValidator, type Rule } from '../model/rule.ts';

import { defineStore, Stores } from '#shared/lib';

/** User rules (redirect, headers, block). Policy rules are not stored here. */
export const rulesItem = defineStore<readonly Rule[]>({
    key: 'rules',
    area: Stores.LOCAL,
    fallback: [],
    validator: rulesValidator,
});
