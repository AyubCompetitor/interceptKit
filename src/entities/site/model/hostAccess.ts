import { domainName, validate } from '#shared/lib';

/** The widest pattern the manifest allows: every site over http and https */
export const ALL_SITES_PATTERN = '*://*/*';

/** A host the site form granted */
export interface HostGrant {
    /** Host without a wildcard, e.g. example.com */
    readonly host: string;
    /** Whether every subdomain of the host is granted too */
    readonly isWithSubdomains: boolean;
}

const HOST_ACCESS_RGXS = {
    /** A scheme such as https:// at the start of what the user typed */
    SCHEME: /^[a-z][a-z\d+.-]*:\/\//,
    /** *:// at the start of a pattern: http and https */
    ANY_SCHEME: /^\*:\/\//,
    /** /* at the end of a pattern: every path */
    ANY_PATH: /\/\*$/,
    /** The host of a match pattern, without a port: *, *.example.com or example.com */
    PATTERN_HOST: /^[^:]+:\/\/([^/:]+)/,
    /** A pattern the site form builds: every scheme and path of one host */
    SITE_FORM_PATTERN: /^\*:\/\/([^/:]+)\/\*$/,
} as const;

/** Host of a match pattern that stands for every host */
const ANY_HOST = '*';

/** Start of a match pattern host that adds every subdomain */
const SUBDOMAINS_PREFIX = '*.';

export const parseHost = (input: string): NotRequired<string> => {
    const value = input.trim().toLowerCase();

    const hasScheme = HOST_ACCESS_RGXS.SCHEME.test(value);
    const url = hasScheme ? value : `http://${value}`;

    if (!URL.canParse(url)) {
        return;
    }

    const { hostname } = new URL(url);

    const isValidHost = validate(domainName, hostname).ok;

    if (!isValidHost) {
        return;
    }

    return hostname;
};

export const buildHostPattern = (host: string, isWithSubdomains: boolean): string => {
    if (isWithSubdomains) {
        return `*://*.${host}/*`;
    }

    return `*://${host}/*`;
};

export const formatHostPattern = (pattern: string): string => {
    const withoutScheme = pattern.replace(HOST_ACCESS_RGXS.ANY_SCHEME, '');

    return withoutScheme.replace(HOST_ACCESS_RGXS.ANY_PATH, '');
};

/** The grant behind a pattern of the site form; none for all sites and for patterns of another shape */
export const parseHostPattern = (pattern: string): NotRequired<HostGrant> => {
    const patternHost = HOST_ACCESS_RGXS.SITE_FORM_PATTERN.exec(pattern)?.[1];

    if (patternHost === undefined || patternHost === ANY_HOST) {
        return;
    }

    if (patternHost.startsWith(SUBDOMAINS_PREFIX)) {
        return {
            host: patternHost.slice(SUBDOMAINS_PREFIX.length),
            isWithSubdomains: true,
        };
    }

    return {
        host: patternHost,
        isWithSubdomains: false,
    };
};

const isHostInPattern = (host: string, pattern: string): boolean => {
    const patternHost = HOST_ACCESS_RGXS.PATTERN_HOST.exec(pattern)?.[1];

    if (patternHost === undefined) {
        return false;
    }

    if (patternHost === ANY_HOST || patternHost === host) {
        return true;
    }

    if (!patternHost.startsWith(SUBDOMAINS_PREFIX)) {
        return false;
    }

    const domain = patternHost.slice(SUBDOMAINS_PREFIX.length);

    return host === domain || host.endsWith(`.${domain}`);
};

/** Whether a granted pattern reaches the host; the scheme is ignored, since rules name hosts, not schemes */
export const isHostCovered = (host: string, patterns: readonly string[]): boolean =>
    patterns.some(pattern => isHostInPattern(host, pattern));

/** Whether a pattern reaches the host of a page's origin */
export const isOriginCovered = (origin: string, patterns: readonly string[]): boolean => {
    if (!URL.canParse(origin)) {
        return false;
    }

    const { hostname } = new URL(origin);

    return isHostCovered(hostname, patterns);
};
