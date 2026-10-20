import { array, boolean, isDuplicateValues, object, PROTOCOLS, refine, string, type Validator } from '#shared/lib';

export interface Site {
    /** Normalized origin, e.g. https://app.example.com */
    readonly origin: string;
    /** Whether mock scripts are injected into pages of this site */
    readonly mocks: boolean;
}

export const MAX_SITES = 1000;

const SITE_ERRORS = {
    NOT_NORMALIZED: 'expected a normalized http(s) origin',
    DUPLICATE_ORIGIN: 'duplicate site',
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

const getOriginError = (value: string): NotRequired<string> => {
    const isNormalized = parseOrigin(value) === value;

    if (isNormalized) {
        return;
    }

    return SITE_ERRORS.NOT_NORMALIZED;
};

const getDuplicateOriginError = (sites: readonly Site[]): NotRequired<string> => {
    const origins = sites.map(site => site.origin);

    if (!isDuplicateValues(origins)) {
        return;
    }

    return SITE_ERRORS.DUPLICATE_ORIGIN;
};

const origin = refine(string({ minLength: 1, maxLength: 2048 }), getOriginError);

export const siteValidator: Validator<Site> = object({ origin, mocks: boolean() });

export const sitesValidator: Validator<Site[]> = refine(
    array(siteValidator, { maxLength: MAX_SITES }),
    getDuplicateOriginError,
);
