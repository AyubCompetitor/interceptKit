import type { Rule } from '#entities/rule';
import { isHostCovered } from '#entities/site';
import { getPatternHost } from '#shared/lib';

const getRuleHosts = (rule: Rule): string[] => {
    const requestHost = getPatternHost(rule.match.url);
    const initiatorDomains = rule.match.initiatorDomains ?? [];

    if (requestHost === undefined) {
        return [...initiatorDomains];
    }

    return [requestHost, ...initiatorDomains];
};

const findUncoveredHost = (rule: Rule, patterns: readonly string[]): NotRequired<string> =>
    getRuleHosts(rule).find(host => !isHostCovered(host, patterns));

export const getMissingAccessHost = (rule: Rule, patterns: readonly string[]): NotRequired<string> => {
    if (!rule.enabled) {
        return;
    }

    return findUncoveredHost(rule, patterns);
};
