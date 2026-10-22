import type { MockHeader } from '#entities/mock';

type XhrResponseBuilder = (body: string, contentType: string) => unknown;

const TEXT_RESPONSE_TYPES = new Set<XMLHttpRequestResponseType>(['', 'text']);

const getTextResponse = (body: string): string => body;

/** XHR gives null for a JSON body that does not parse */
const getJsonResponse = (body: string): unknown => {
    try {
        return JSON.parse(body);
    } catch {
        return null;
    }
};

const getArrayBufferResponse = (body: string): ArrayBuffer => new TextEncoder().encode(body).buffer;

const getBlobResponse = (body: string, contentType: string): Blob => new Blob([body], { type: contentType });

/** Mocks serve JSON and text, so parsing them as HTML or XML documents is left out */
const getDocumentResponse = (): null => null;

const XHR_RESPONSE_BUILDERS: Record<XMLHttpRequestResponseType, XhrResponseBuilder> = {
    '': getTextResponse,
    text: getTextResponse,
    json: getJsonResponse,
    arraybuffer: getArrayBufferResponse,
    blob: getBlobResponse,
    document: getDocumentResponse,
};

export const isTextResponseType = (responseType: XMLHttpRequestResponseType): boolean => {
    return TEXT_RESPONSE_TYPES.has(responseType);
};

/** What xhr.response holds for a mocked body, by the responseType the page asked for */
export const buildXhrResponse = (
    body: string,
    responseType: XMLHttpRequestResponseType,
    contentType: Nullable<string>,
): unknown => {
    const buildResponse = XHR_RESPONSE_BUILDERS[responseType];

    return buildResponse(body, contentType ?? '');
};

/** Response headers in the format of getAllResponseHeaders */
export const formatXhrHeaders = (headers: readonly MockHeader[]): string => {
    return headers.map(([name, value]) => `${name}: ${value}\r\n`).join('');
};
