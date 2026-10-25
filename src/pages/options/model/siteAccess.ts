import type { ManagedPolicy } from '#entities/config';
import type { Rule } from '#entities/rule';
import { isHostCovered } from '#entities/site';
import { getAllowedHostPattern } from '#features/policy';
import { getPatternHost } from '#shared/lib';

/** A host a rule cannot reach yet */
export interface MissingAccess {
    /** Host the rule needs */
    readonly host: string;
    /** Pattern to ask the browser for; none when the policy does not allow the host */
    readonly pattern: NotRequired<string>;
}

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

export const getMissingAccess = (
    rule: Rule,
    patterns: readonly string[],
    policy: ManagedPolicy,
): NotRequired<MissingAccess> => {
    const host = getMissingAccessHost(rule, patterns);

    if (host === undefined) {
        return;
    }

    return {
        host,
        pattern: getAllowedHostPattern(host, policy),
    };
};
