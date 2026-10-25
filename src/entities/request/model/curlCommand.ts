import { HttpMethods, quoteShellWord, type KeyValue } from '#shared/lib';

import { buildOutgoingBody, getActivePairs, type OutgoingBody } from './outgoingRequest.ts';
import { isBodylessMethod, type ApiRequest } from './request.ts';

const CONTENT_TYPE_HEADER = 'content-type';

const FETCH_TEXT_TYPE = 'text/plain;charset=UTF-8';

const LINE_BREAK = ' \\\n  ';

const getSentBody = (request: ApiRequest): NotRequired<OutgoingBody> => {
    if (isBodylessMethod(request.method)) {
        return;
    }

    return buildOutgoingBody(request.body);
};

const isContentTypeHeader = (header: KeyValue): boolean => header.key.trim().toLowerCase() === CONTENT_TYPE_HEADER;

const getMethodOptions = (request: ApiRequest, body: NotRequired<OutgoingBody>): string[] => {
    const isImplied = request.method === HttpMethods.GET || (request.method === HttpMethods.POST && !!body);

    if (isImplied) {
        return [];
    }

    if (request.method === HttpMethods.HEAD) {
        return ['--head'];
    }

    return [`-X ${request.method}`];
};

const formatHeader = (key: string, value: string): string => `-H ${quoteShellWord(`${key.trim()}: ${value}`)}`;

const getHeaderOptions = (request: ApiRequest, body: NotRequired<OutgoingBody>): string[] => {
    const headers = getActivePairs(request.headers);
    const options = headers.map(header => formatHeader(header.key, header.value));

    if (!body || headers.some(isContentTypeHeader)) {
        return options;
    }

    return [...options, formatHeader(CONTENT_TYPE_HEADER, body.contentType || FETCH_TEXT_TYPE)];
};

const getBodyOptions = (body: NotRequired<OutgoingBody>): string[] => {
    if (!body) {
        return [];
    }

    return [`--data-raw ${quoteShellWord(body.text)}`];
};

/** A bash command for the request as it is; variables are filled in before, the browser's cookies never go */
export const buildCurlCommand = (request: ApiRequest): string => {
    const body = getSentBody(request);

    const parts = [
        `curl ${quoteShellWord(request.url.trim())}`,
        ...getMethodOptions(request, body),
        ...getHeaderOptions(request, body),
        ...getBodyOptions(body),
    ];

    return parts.join(LINE_BREAK);
};
