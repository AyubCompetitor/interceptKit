import {
    fail,
    headerName,
    headerValue,
    httpUrl,
    ok,
    validate,
    type HttpMethod,
    type KeyValue,
    type Result,
} from '#shared/lib';

import { apiRequestValidator, RequestBodyTypes, type ApiRequest, type RequestBody } from './request.ts';
import { isBrowserHeader, isForbiddenHeader } from './requestHeaders.ts';

/** Whether fetch() sends the site's cookies with the request */
export enum CredentialsModes {
    OMIT = 'omit',
    INCLUDE = 'include',
}

export type CredentialsMode = `${CredentialsModes}`;

/** A header name with its value, in the shape fetch() takes */
export type HeaderEntry = readonly [name: string, value: string];

/** A header that fetch() drops, set on the request by a browser rule */
export interface RuleHeader {
    /** Lowercase name, the form rules take */
    readonly name: string;
    /** Value; repeated headers are joined into one */
    readonly value: string;
}

/** What fetch() gets for a request of the API client */
export interface OutgoingRequest {
    /** Absolute URL with its query, as the browser writes it */
    readonly url: string;
    /** HTTP method */
    readonly method: HttpMethod;
    /** Headers in the order of the request that fetch() sends itself */
    readonly headers: readonly HeaderEntry[];
    /** Headers fetch() drops; a browser rule sets them on this request only */
    readonly ruleHeaders: readonly RuleHeader[];
    /** Body text; none for a request without a body */
    readonly body?: string;
    /** Cookies go only when the user turned them on */
    readonly credentials: CredentialsMode;
}

/** The body of a request with the content type it is sent under */
export interface OutgoingBody {
    /** Body text */
    readonly text: string;
    /** Content type; empty leaves the choice to the browser */
    readonly contentType: string;
}

const HEADERS_PATH = '$.headers';

const CONTENT_TYPE_HEADER = 'content-type';

const COOKIE_HEADER = 'cookie';

/** HTTP joins repeated headers with commas, and cookies with semicolons */
const VALUE_SEPARATORS = {
    COOKIE: '; ',
    LIST: ', ',
} as const;

const JSON_TYPE = 'application/json';

const FORM_TYPE = 'application/x-www-form-urlencoded';

const OUTGOING_ERRORS = {
    INVALID_HEADER_NAME: 'is not a valid header name',
    INVALID_HEADER_VALUE: 'has a value with characters a header cannot carry',
} as const;

/** A switched-off pair or a row without a key is not sent */
const isActivePair = (pair: KeyValue): boolean => pair.enabled && pair.key.trim() !== '';

export const getActivePairs = (pairs: readonly KeyValue[]): KeyValue[] => pairs.filter(isActivePair);

export const buildOutgoingBody = (body: RequestBody): NotRequired<OutgoingBody> => {
    if (body.bodyType === RequestBodyTypes.NONE) {
        return;
    }

    if (body.bodyType === RequestBodyTypes.FORM) {
        const pairs = getActivePairs(body.fields).map(field => [field.key, field.value]);

        return {
            text: new URLSearchParams(pairs).toString(),
            contentType: FORM_TYPE,
        };
    }

    if (body.bodyType === RequestBodyTypes.RAW) {
        return {
            text: body.text,
            contentType: body.contentType.trim(),
        };
    }

    return {
        text: body.text,
        contentType: JSON_TYPE,
    };
};

const mapPairToHeader = (pair: KeyValue): HeaderEntry => [pair.key.trim(), pair.value];

const isContentTypeHeader = ([name]: HeaderEntry): boolean => name.toLowerCase() === CONTENT_TYPE_HEADER;

const getTypedHeaders = (request: ApiRequest): HeaderEntry[] => getActivePairs(request.headers).map(mapPairToHeader);

const isFetchHeader = ([name, value]: HeaderEntry): boolean => !isForbiddenHeader(name, value);

const isRuleHeader = ([name, value]: HeaderEntry): boolean => isForbiddenHeader(name, value) && !isBrowserHeader(name);

const getValueSeparator = (name: string): string => {
    if (name !== COOKIE_HEADER) {
        return VALUE_SEPARATORS.LIST;
    }

    return VALUE_SEPARATORS.COOKIE;
};

const buildRuleHeaders = (request: ApiRequest): RuleHeader[] => {
    const values = new Map<string, string[]>();

    for (const header of getTypedHeaders(request)) {
        if (!isRuleHeader(header)) {
            continue;
        }

        const [name, value] = header;
        const lowerName = name.toLowerCase();
        const parts = values.get(lowerName);

        if (parts) {
            parts.push(value);
            continue;
        }

        values.set(lowerName, [value]);
    }

    return Array.from(values, ([name, parts]) => ({
        name,
        value: parts.join(getValueSeparator(name)),
    }));
};

/** Headers the user typed win over the content type of the body format */
const buildHeaders = (request: ApiRequest, body: NotRequired<OutgoingBody>): HeaderEntry[] => {
    const headers = getTypedHeaders(request).filter(isFetchHeader);

    const hasContentType = headers.some(isContentTypeHeader);

    if (body === undefined || body.contentType === '' || hasContentType) {
        return headers;
    }

    return [...headers, [CONTENT_TYPE_HEADER, body.contentType]];
};

/** fetch() throws on a header it cannot send, so the reason is found before sending */
const getHeaderError = ([name, value]: HeaderEntry): NotRequired<string> => {
    if (!validate(headerName, name).ok) {
        return `"${name}" ${OUTGOING_ERRORS.INVALID_HEADER_NAME}`;
    }

    if (!validate(headerValue, value).ok) {
        return `"${name}" ${OUTGOING_ERRORS.INVALID_HEADER_VALUE}`;
    }

    return;
};

const getHeadersError = (headers: readonly HeaderEntry[]): NotRequired<string> => {
    for (const header of headers) {
        const error = getHeaderError(header);

        if (error !== undefined) {
            return error;
        }
    }

    return;
};

export const buildOutgoingRequest = (request: ApiRequest): Result<OutgoingRequest> => {
    const requestResult = validate(apiRequestValidator, request);

    if (!requestResult.ok) {
        return requestResult;
    }

    const rawUrl = request.url.trim();
    const urlResult = validate(httpUrl, rawUrl);

    if (!urlResult.ok) {
        return urlResult;
    }

    const body = buildOutgoingBody(request.body);
    const headers = buildHeaders(request, body);
    const headersError = getHeadersError(getTypedHeaders(request));

    if (headersError !== undefined) {
        return fail(HEADERS_PATH, headersError);
    }

    return ok({
        url: new URL(rawUrl).href,
        method: request.method,
        headers,
        ruleHeaders: buildRuleHeaders(request),
        credentials: request.sendCookies ? CredentialsModes.INCLUDE : CredentialsModes.OMIT,
        ...(body && { body: body.text }),
    });
};
