import { describe, expect, it } from '@rstest/core';

import { buildApiRequest, createRequestDraft, getDroppedHeaderNames, mapCurlToDraft } from '../requestDraft.ts';

import { apiRequestValidator, RequestBodyTypes, type CurlImport } from '#entities/request';
import { HttpMethods, validate } from '#shared/lib';

import { makeDraft, makeRow } from './mocks.ts';

const FILLED_BODIES = {
    jsonBody: '{"a":1}',
    rawBody: '<a/>',
    rawContentType: 'text/xml',
    formFields: [makeRow('name', 'Ada')],
};

describe('request drafts', () => {
    it('start a new request as a GET without a body or cookies', () => {
        const draft = createRequestDraft();

        expect(draft).toMatchObject({
            method: HttpMethods.GET,
            url: '',
            bodyType: RequestBodyTypes.NONE,
            sendCookies: false,
        });

        expect(draft.id).not.toBe(createRequestDraft().id);
    });

    it('make a request that the validator accepts', () => {
        const request = buildApiRequest(makeDraft({ url: 'https://api.example.com' }));

        expect(validate(apiRequestValidator, request).ok).toBe(true);
    });

    it.each([
        {
            name: 'JSON',
            bodyType: RequestBodyTypes.JSON,
            body: { bodyType: RequestBodyTypes.JSON, text: '{"a":1}' },
        },
        {
            name: 'raw text',
            bodyType: RequestBodyTypes.RAW,
            body: { bodyType: RequestBodyTypes.RAW, text: '<a/>', contentType: 'text/xml' },
        },
        {
            name: 'a form',
            bodyType: RequestBodyTypes.FORM,
            body: { bodyType: RequestBodyTypes.FORM, fields: [{ key: 'name', value: 'Ada', enabled: true }] },
        },
    ])('send only the body of the chosen format: $name', ({ bodyType, body }) => {
        const draft = makeDraft({ ...FILLED_BODIES, method: HttpMethods.POST, bodyType });

        expect(buildApiRequest(draft).body).toEqual(body);
    });

    it.each([HttpMethods.GET, HttpMethods.HEAD])('send %s without the body it keeps', method => {
        const draft = makeDraft({ ...FILLED_BODIES, method, bodyType: RequestBodyTypes.JSON });

        expect(buildApiRequest(draft).body).toEqual({ bodyType: RequestBodyTypes.NONE });
    });

    it('name the enabled headers that the browser drops', () => {
        const headers = [
            makeRow(' Cookie ', 'a=1'),
            makeRow('Authorization', 'Bearer x'),
            makeRow('User-Agent', 'x', false),
        ];

        expect(getDroppedHeaderNames(makeDraft({ headers }))).toEqual(['Cookie']);
    });
});

describe('mapCurlToDraft', () => {
    const imported: CurlImport = {
        method: HttpMethods.POST,
        url: 'https://api.example.com/users',
        query: [{ key: 'page', value: '2', enabled: true }],
        headers: [{ key: 'Cookie', value: 'session=abc', enabled: true }],
        body: { bodyType: RequestBodyTypes.JSON, text: '{"name":"Ada"}' },
    };

    it('opens the command as a request with its method, URL, query, headers and body', () => {
        const request = buildApiRequest(mapCurlToDraft(imported));

        expect(request).toMatchObject({
            method: imported.method,
            url: imported.url,
            query: imported.query,
            headers: imported.headers,
            body: imported.body,
        });
    });

    it('keeps the cookie switch off, since cookies of the command come as a header', () => {
        expect(mapCurlToDraft(imported).sendCookies).toBe(false);
    });

    it('gives each import a tab of its own', () => {
        expect(mapCurlToDraft(imported).id).not.toBe(mapCurlToDraft(imported).id);
    });
});
