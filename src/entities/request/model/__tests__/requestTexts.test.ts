import { describe, expect, it } from '@rstest/core';

import { HttpMethods } from '#shared/lib';

import { RequestBodyTypes, type ApiRequest, type RequestBody } from '../request.ts';
import { getRequestTexts, mapRequestTexts } from '../requestTexts.ts';

import { makePair } from './mocks.ts';

const makeApiRequest = (body: RequestBody): ApiRequest => ({
    id: 'q1',
    method: HttpMethods.POST,
    url: 'url',
    query: [makePair('qk', 'qv'), makePair('qoff', 'x', false)],
    headers: [makePair('hk', 'hv')],
    body,
    sendCookies: false,
});

const FORM_BODY: RequestBody = { bodyType: RequestBodyTypes.FORM, fields: [makePair('fk', 'fv')] };

const RAW_BODY: RequestBody = { bodyType: RequestBodyTypes.RAW, text: 'raw', contentType: 'type' };

const JSON_BODY: RequestBody = { bodyType: RequestBodyTypes.JSON, text: 'json' };

const toUpperCase = (text: string): string => text.toUpperCase();

describe('mapRequestTexts', () => {
    it('changes the URL, every pair and the body', () => {
        const request = mapRequestTexts(makeApiRequest(FORM_BODY), toUpperCase);

        expect(request).toMatchObject({
            url: 'URL',
            query: [makePair('QK', 'QV'), makePair('QOFF', 'X', false)],
            headers: [makePair('HK', 'HV')],
            body: { fields: [makePair('FK', 'FV')] },
        });
    });

    it.each([
        { name: 'raw text and its type', body: RAW_BODY, mapped: { ...RAW_BODY, text: 'RAW', contentType: 'TYPE' } },
        { name: 'JSON', body: JSON_BODY, mapped: { ...JSON_BODY, text: 'JSON' } },
    ])('changes $name', ({ body, mapped }) => {
        expect(mapRequestTexts(makeApiRequest(body), toUpperCase).body).toEqual(mapped);
    });
});

describe('getRequestTexts', () => {
    it('gives the texts that go out, without switched-off pairs', () => {
        expect(getRequestTexts(makeApiRequest(FORM_BODY))).toEqual(['url', 'qk', 'qv', 'hk', 'hv', 'fk', 'fv']);
    });

    it('gives the text and the type of a raw body', () => {
        expect(getRequestTexts(makeApiRequest(RAW_BODY)).slice(-2)).toEqual(['raw', 'type']);
    });
});
