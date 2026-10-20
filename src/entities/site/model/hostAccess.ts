import { domainName, validate } from '#shared/lib';

/** The widest pattern the manifest allows: every site over http and https */
export const ALL_SITES_PATTERN = '*://*/*';

const HOST_ACCESS_RGXS = {
    /** A scheme such as https:// at the start of what the user typed */
    SCHEME: /^[a-z][a-z\d+.-]*:\/\//,
    /** *:// at the start of a pattern: http and https */
    ANY_SCHEME: /^\*:\/\//,
    /** /* at the end of a pattern: every path */
    ANY_PATH: /\/\*$/,
} as const;

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
