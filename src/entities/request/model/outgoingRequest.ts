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
import { isForbiddenHeader } from './requestHeaders.ts';

/** Whether fetch() sends the site's cookies with the request */
export enum CredentialsModes {
    OMIT = 'omit',
    INCLUDE = 'include',
}

export type CredentialsMode = `${CredentialsModes}`;

/** A header name with its value, in the shape fetch() takes */
export type HeaderEntry = readonly [name: string, value: string];

/** What fetch() gets for a request of the API client */
export interface OutgoingRequest {
    /** Absolute URL with the query parameters added */
    readonly url: string;
    /** HTTP method */
    readonly method: HttpMethod;
    /** Headers in the order of the request, without those the browser would drop */
    readonly headers: readonly HeaderEntry[];
    /** Body text; none for a request without a body */
    readonly body?: string;
    /** Cookies go only when the user turned them on */
    readonly credentials: CredentialsMode;
}

/** The body of a request with the content type it is sent under */
interface OutgoingBody {
    /** Body text */
    readonly text: string;
    /** Content type; empty leaves the choice to the browser */
    readonly contentType: string;
}

const HEADERS_PATH = '$.headers';

const CONTENT_TYPE_HEADER = 'content-type';

const JSON_TYPE = 'application/json';

const FORM_TYPE = 'application/x-www-form-urlencoded';

const QUERY_START = '?';

const QUERY_SEPARATOR = '&';

const OUTGOING_ERRORS = {
    INVALID_HEADER_NAME: 'is not a valid header name',
    INVALID_HEADER_VALUE: 'has a value with characters a header cannot carry',
} as const;

/** A switched-off pair or a row without a key is not sent */
const isActivePair = (pair: KeyValue): boolean => pair.enabled && pair.key.trim() !== '';

const getActivePairs = (pairs: readonly KeyValue[]): KeyValue[] => pairs.filter(isActivePair);

/** Adds the parameters after the query of the URL as typed, which stays untouched */
const buildUrl = (rawUrl: string, query: readonly KeyValue[]): string => {
    const url = new URL(rawUrl);
    const pairs = getActivePairs(query).map(pair => [pair.key, pair.value]);
    const addedQuery = new URLSearchParams(pairs).toString();

    if (addedQuery === '') {
        return url.href;
    }

    const hasQuery = url.search.length > QUERY_START.length;

    url.search = hasQuery ? `${url.search}${QUERY_SEPARATOR}${addedQuery}` : addedQuery;

    return url.href;
};

const buildBody = (body: RequestBody): NotRequired<OutgoingBody> => {
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

/** Headers the user typed win over the content type of the body format */
const buildHeaders = (request: ApiRequest, body: NotRequired<OutgoingBody>): HeaderEntry[] => {
    const headers = getActivePairs(request.headers)
        .map(mapPairToHeader)
        .filter(([name, value]) => !isForbiddenHeader(name, value));

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

/** What fetch() sends for the request; the reason when the request cannot go as it is */
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

    const body = buildBody(request.body);
    const headers = buildHeaders(request, body);
    const headersError = getHeadersError(headers);

    if (headersError !== undefined) {
        return fail(HEADERS_PATH, headersError);
    }

    return ok({
        url: buildUrl(rawUrl, request.query),
        method: request.method,
        headers,
        credentials: request.sendCookies ? CredentialsModes.INCLUDE : CredentialsModes.OMIT,
        ...(body && { body: body.text }),
    });
};
