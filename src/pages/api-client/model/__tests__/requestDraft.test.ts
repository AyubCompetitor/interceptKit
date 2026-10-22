import { describe, expect, it } from '@rstest/core';

import { buildApiRequest, createRequestDraft, getDroppedHeaderNames } from '../requestDraft.ts';

import { apiRequestValidator, RequestBodyTypes } from '#entities/request';
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
