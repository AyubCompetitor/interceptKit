import type { ManagedPolicy } from '#entities/config';
import { buildHostPattern, parsePatternHost } from '#entities/site';

const SUBDOMAINS_PREFIX = '*.';

const isHostInEntry = (host: string, entry: string): boolean => {
    if (!entry.startsWith(SUBDOMAINS_PREFIX)) {
        return host === entry;
    }

    const domain = entry.slice(SUBDOMAINS_PREFIX.length);

    return host === domain || host.endsWith(`.${domain}`);
};

const isPatternHostInEntry = (patternHost: string, entry: string): boolean => {
    if (!patternHost.startsWith(SUBDOMAINS_PREFIX)) {
        return isHostInEntry(patternHost, entry);
    }

    return entry.startsWith(SUBDOMAINS_PREFIX) && isHostInEntry(patternHost.slice(SUBDOMAINS_PREFIX.length), entry);
};

const isPatternInList = (pattern: string, allowedHosts: readonly string[]): boolean => {
    const patternHost = parsePatternHost(pattern);

    if (patternHost === undefined) {
        return false;
    }

    return allowedHosts.some(entry => isPatternHostInEntry(patternHost, entry));
};

export const isHostAllowed = (host: string, policy: ManagedPolicy): boolean =>
    !policy.allowedHosts || policy.allowedHosts.some(entry => isHostInEntry(host, entry));

export const isPatternAllowed = (pattern: string, policy: ManagedPolicy): boolean =>
    !policy.allowedHosts || isPatternInList(pattern, policy.allowedHosts);

export const getDisallowedPatterns = (patterns: readonly string[], policy: ManagedPolicy): string[] =>
    patterns.filter(pattern => !isPatternAllowed(pattern, policy));

export const getAllowedHostPattern = (host: string, policy: ManagedPolicy): NotRequired<string> => {
    const patterns = [buildHostPattern(host, true), buildHostPattern(host, false)];

    return patterns.find(pattern => isPatternAllowed(pattern, policy));
};
