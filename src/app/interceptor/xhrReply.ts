import type { MockHeader } from '#entities/mock';

type XhrResponseBuilder = (body: string, contentType: string) => unknown;

const TEXT_RESPONSE_TYPES = new Set<XMLHttpRequestResponseType>(['', 'text']);

const getTextResponse = (body: string): string => body;

const getJsonResponse = (body: string): unknown => {
    try {
        return JSON.parse(body);
    } catch {
        return null;
    }
};

const getArrayBufferResponse = (body: string): ArrayBuffer => new TextEncoder().encode(body).buffer;

const getBlobResponse = (body: string, contentType: string): Blob => new Blob([body], { type: contentType });

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

export const buildXhrResponse = (
    body: string,
    responseType: XMLHttpRequestResponseType,
    contentType: Nullable<string>,
): unknown => {
    const buildResponse = XHR_RESPONSE_BUILDERS[responseType];

    return buildResponse(body, contentType ?? '');
};

export const formatXhrHeaders = (headers: readonly MockHeader[]): string =>
    headers.map(([name, value]) => `${name}: ${value}\r\n`).join('');
