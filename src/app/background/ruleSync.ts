import {
    Features,
    isFeatureEnabled,
    readPolicy,
    settingsItem,
    type Feature,
    type ManagedPolicy,
    type Settings,
} from '#entities/config';
import { compileRules, rulesItem, type Rule } from '#entities/rule';
import { Sources, Stores, type TaskQueue } from '#shared/lib';
import {
    readStoreData,
    readItem,
    replaceDynamicRules,
    watchStoreChanges,
    watchExtensionStart,
    watchItem,
} from '#shared/platform';

const RULE_FEATURES: Record<Rule['type'], Feature> = {
    redirect: Features.REDIRECT,
    headers: Features.HEADERS,
    block: Features.BLOCK,
};

const isRuleActive = (rule: Rule, policy: ManagedPolicy): boolean => {
    /** Only an explicit false forbids user rules: without a policy the field is absent */
    const isForbiddenUserRule = rule.source === Sources.USER && policy.allowUserRules === false;

    if (!rule.enabled || isForbiddenUserRule) {
        return false;
    }

    return isFeatureEnabled(policy, RULE_FEATURES[rule.type]);
};

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
    const managedData = await readStoreData(Stores.MANAGED);

    const { policy } = readPolicy(managedData);

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
