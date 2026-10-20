import type { Rule } from './rule.ts';

export const upsertRule = (rules: readonly Rule[], rule: Rule): Rule[] => {
    const index = rules.findIndex(current => current.id === rule.id);

    if (index === -1) {
        return [...rules, rule];
    }

    return rules.with(index, rule);
};

export const removeRule = (rules: readonly Rule[], id: string): Rule[] => rules.filter(rule => rule.id !== id);
