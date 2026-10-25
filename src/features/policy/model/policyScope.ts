import { Features, isFeatureEnabled, type Feature, type ManagedPolicy } from '#entities/config';
import type { Mock } from '#entities/mock';
import { RuleTypes, type Rule, type RuleType } from '#entities/rule';
import { Sources, type Source } from '#shared/lib';

export const RULE_FEATURES: Readonly<Record<RuleType, Feature>> = {
    [RuleTypes.REDIRECT]: Features.REDIRECT,
    [RuleTypes.HEADERS]: Features.HEADERS,
    [RuleTypes.BLOCK]: Features.BLOCK,
};

export const isVaultRequired = (policy: ManagedPolicy): boolean => policy.requireVault === true;

export const isPolicyOnly = (policy: ManagedPolicy): boolean => policy.allowUserRules === false;

const isUserRecordForbidden = (source: Source, policy: ManagedPolicy): boolean =>
    source === Sources.USER && isPolicyOnly(policy);

export const isRuleAllowed = (rule: Rule, policy: ManagedPolicy): boolean =>
    !isUserRecordForbidden(rule.source, policy) && isFeatureEnabled(policy, RULE_FEATURES[rule.type]);

export const isMockAllowed = (mock: Mock, policy: ManagedPolicy): boolean =>
    !isUserRecordForbidden(mock.source, policy) && isFeatureEnabled(policy, Features.MOCKS);

export const getDisabledRuleFeatures = (policy: ManagedPolicy): Feature[] =>
    Object.values(RULE_FEATURES).filter(feature => !isFeatureEnabled(policy, feature));
