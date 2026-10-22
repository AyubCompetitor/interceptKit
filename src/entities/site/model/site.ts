import { array, boolean, isDuplicateValues, object, PROTOCOLS, refine, string, type Validator } from '#shared/lib';

/** Settings of a site the browser granted access to */
export interface Site {
    /** Host pattern as the browser granted it, e.g. *://*.example.com/* */
    readonly pattern: string;
    /** Whether mock scripts are injected into pages the pattern covers */
    readonly mocks: boolean;
}

export const MAX_SITES = 1000;

/** A scheme, a host and every path: the shape of every host pattern the browser grants */
const HOST_PATTERN_RGX = /^(\*|https?):\/\/[^/]+\/\*$/;

const SITE_ERRORS = {
    DUPLICATE_PATTERN: 'duplicate site',
} as const;

export const parseOrigin = (input: string): NotRequired<string> => {
    if (!URL.canParse(input)) {
        return;
    }

    const url = new URL(input);

    const isValidProtocol = PROTOCOLS.includes(url.protocol);

    if (!isValidProtocol) {
        return;
    }

    return url.origin;
};

const getDuplicatePatternError = (sites: readonly Site[]): NotRequired<string> => {
    const patterns = sites.map(site => site.pattern);

    if (!isDuplicateValues(patterns)) {
        return;
    }

    return SITE_ERRORS.DUPLICATE_PATTERN;
};

const hostPattern = string({ minLength: 1, maxLength: 2048, pattern: HOST_PATTERN_RGX });

export const siteValidator: Validator<Site> = object({
    pattern: hostPattern,
    mocks: boolean(),
});

export const sitesValidator: Validator<Site[]> = refine(
    array(siteValidator, { maxLength: MAX_SITES }),
    getDuplicatePatternError,
);
