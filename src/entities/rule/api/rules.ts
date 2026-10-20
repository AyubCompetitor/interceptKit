import { rulesValidator, ruleValidator, type Rule } from '../model/rule.ts';

import { defineMethod, defineStoreItem, identifier, object, Stores } from '#shared/lib';

export interface RuleIdParams {
    /** Id of the rule */
    readonly id: string;
}

/** User rules (redirect, headers, block). Policy rules are not stored here. */
export const rulesItem = defineStoreItem<readonly Rule[]>({
    key: 'rules',
    area: Stores.LOCAL,
    fallback: [],
    validator: rulesValidator,
});

/** Rules are written only by the background, which also keeps DNR in sync with them */
export const rulesRpc = {
    save: defineMethod<Rule, Rule>('rules/save', ruleValidator),
    remove: defineMethod<RuleIdParams, void>('rules/remove', object({ id: identifier })),
} as const;
