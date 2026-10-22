import { buildUrlPatternRgx } from '#shared/lib';

import type { MockMatch } from './mock.ts';
import type { PageMock } from './pageMock.ts';

/** A request as the page sends it */
export interface MockRequest {
    /** Absolute URL without the fragment */
    readonly url: string;
    /** Method in any letter case: fetch keeps nonstandard methods as written */
    readonly method: string;
}

/** A mock with its URL pattern compiled once, not on every request */
export interface MockMatcher {
    /** The mock */
    readonly mock: PageMock;
    /** The URL pattern as a regular expression */
    readonly urlRgx: RegExp;
}

const isMethodMatched = (match: MockMatch, method: string): boolean => {
    if (!match.methods) {
        return true;
    }

    const upperMethod = method.toUpperCase();

    return match.methods.some(matchMethod => matchMethod === upperMethod);
};

const isRequestMatched = (matcher: MockMatcher, request: MockRequest): boolean => {
    const isUrlMatched = matcher.urlRgx.test(request.url);

    return isUrlMatched && isMethodMatched(matcher.mock.match, request.method);
};

export const buildMockMatchers = (mocks: readonly PageMock[]): MockMatcher[] => {
    return mocks.map(mock => ({
        mock,
        urlRgx: buildUrlPatternRgx(mock.match.url),
    }));
};

/** The first mock that answers the request: as with rules, the list order is the priority */
export const findPageMock = (matchers: readonly MockMatcher[], request: MockRequest): NotRequired<PageMock> => {
    const matcher = matchers.find(current => isRequestMatched(current, request));

    return matcher?.mock;
};

/** The URL the network would get: resolved against the page, without the fragment */
export const resolveRequestUrl = (rawUrl: string, baseUrl: string): NotRequired<string> => {
    if (!URL.canParse(rawUrl, baseUrl)) {
        return;
    }

    const url = new URL(rawUrl, baseUrl);

    url.hash = '';

    return url.href;
};
