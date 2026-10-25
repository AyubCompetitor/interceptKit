import { settingsItem, type ManagedPolicy, type Settings } from '#entities/config';
import { compileRules, rulesItem, type Rule } from '#entities/rule';
import { isRuleAllowed } from '#features/policy';
import { Stores, type TaskQueue } from '#shared/lib';
import { readItem, replaceDynamicRules, watchStoreChanges, watchExtensionStart, watchItem } from '#shared/platform';

import { readManagedPolicy } from './managedPolicy.ts';

const isRuleActive = (rule: Rule, policy: ManagedPolicy): boolean => rule.enabled && isRuleAllowed(rule, policy);

export const selectActiveRules = (rules: readonly Rule[], settings: Settings, policy: ManagedPolicy): Rule[] => {
    if (!settings.enabled) {
        return [];
    }

    const activeRules = rules.filter(rule => isRuleActive(rule, policy));

    return activeRules;
};

export const syncRules = async (): Promise<void> => {
    const rules = await readItem(rulesItem);
    const settings = await readItem(settingsItem);
    const policy = await readManagedPolicy();

    const activeRules = selectActiveRules(rules, settings, policy);
    const compiledRules = compileRules(activeRules);

    await replaceDynamicRules(compiledRules);
};

export const startRuleSync = (storageReady: Promise<void>, enqueue: TaskQueue): void => {
    const requestSync: VoidFunction = () => {
        enqueue(async () => {
            await storageReady;
            await syncRules();
        }).catch((error: unknown) => console.error('[rules] sync failed', error));
    };

    watchItem(rulesItem, requestSync);
    watchItem(settingsItem, requestSync);
    watchStoreChanges(Stores.MANAGED, requestSync);

    watchExtensionStart(requestSync);
};
