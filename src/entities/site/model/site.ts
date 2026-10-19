import { array, boolean, object, Protocols, refine, string, type Validator } from '#shared/lib';

export interface Site {
    /** Normalized origin, e.g. https://app.example.com */
    readonly origin: string;
    /** Whether mock scripts are injected into pages of this site */
    readonly mocks: boolean;
}

export const MAX_SITES = 1000;

export const parseOrigin = (input: string): NotRequired<string> => {
    if (!URL.canParse(input)) {
        return;
    }

    const url = new URL(input);

    if (url.protocol !== Protocols.HTTP && url.protocol !== Protocols.HTTPS) {
        return;
    }

    return url.origin;
};

const origin = refine(string({ minLength: 1, maxLength: 2048 }), value =>
    parseOrigin(value) === value ? undefined : 'expected a normalized https origin',
);

export const siteValidator: Validator<Site> = object({ origin, mocks: boolean() });

export const sitesValidator: Validator<Site[]> = refine(array(siteValidator, { maxLength: MAX_SITES }), sites =>
    new Set(sites.map(site => site.origin)).size === sites.length ? undefined : 'duplicate site',
);
