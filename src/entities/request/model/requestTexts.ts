import type { KeyValue } from '#shared/lib';

import { RequestBodyTypes, type ApiRequest, type RequestBody } from './request.ts';

/** Changes one text of a request, such as a URL or a header value */
export type TextMapper = (text: string) => string;

const mapPairTexts = (pair: KeyValue, mapText: TextMapper): KeyValue => ({
    ...pair,
    key: mapText(pair.key),
    value: mapText(pair.value),
});

const mapBodyTexts = (body: RequestBody, mapText: TextMapper): RequestBody => {
    if (body.bodyType === RequestBodyTypes.NONE) {
        return body;
    }

    if (body.bodyType === RequestBodyTypes.FORM) {
        return { ...body, fields: body.fields.map(field => mapPairTexts(field, mapText)) };
    }

    if (body.bodyType === RequestBodyTypes.RAW) {
        return { ...body, text: mapText(body.text), contentType: mapText(body.contentType) };
    }

    return { ...body, text: mapText(body.text) };
};

/** The request with every text the user typed changed, for example with {{variables}} filled in */
export const mapRequestTexts = (request: ApiRequest, mapText: TextMapper): ApiRequest => ({
    ...request,
    url: mapText(request.url),
    query: request.query.map(pair => mapPairTexts(pair, mapText)),
    headers: request.headers.map(pair => mapPairTexts(pair, mapText)),
    body: mapBodyTexts(request.body, mapText),
});

const getPairTexts = (pairs: readonly KeyValue[]): string[] => {
    const enabledPairs = pairs.filter(pair => pair.enabled);

    return enabledPairs.flatMap(pair => [pair.key, pair.value]);
};

const getBodyTexts = (body: RequestBody): string[] => {
    if (body.bodyType === RequestBodyTypes.NONE) {
        return [];
    }

    if (body.bodyType === RequestBodyTypes.FORM) {
        return getPairTexts(body.fields);
    }

    if (body.bodyType === RequestBodyTypes.RAW) {
        return [body.text, body.contentType];
    }

    return [body.text];
};

/** The texts that go out with the request: switched-off pairs stay home */
export const getRequestTexts = (request: ApiRequest): string[] => [
    request.url,
    ...getPairTexts(request.query),
    ...getPairTexts(request.headers),
    ...getBodyTexts(request.body),
];
