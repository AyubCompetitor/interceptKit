import { describe, expect, it } from '@rstest/core';

import { HttpMethods } from '#shared/lib';

import { buildOutgoingRequest, CredentialsModes, type OutgoingRequest } from '../outgoingRequest.ts';
import { RequestBodyTypes, type ApiRequest, type RequestBody } from '../request.ts';

import { makePair } from './mocks.ts';

const makeApiRequest = (overrides: Partial<ApiRequest> = {}): ApiRequest => ({
    id: 'q1',
    method: HttpMethods.GET,
    url: 'https://api.example.com/users',
    query: [],
    headers: [],
    body: { bodyType: RequestBodyTypes.NONE },
    sendCookies: false,
    ...overrides,
});

const getOutgoing = (overrides: Partial<ApiRequest>): OutgoingRequest => {
    const result = buildOutgoingRequest(makeApiRequest(overrides));

    if (!result.ok) {
        throw new Error('expected a request that can be sent');
    }

    return result.value;
};

const JSON_BODY: RequestBody = { bodyType: RequestBodyTypes.JSON, text: '{"a":1}' };

const FORM_BODY: RequestBody = {
    bodyType: RequestBodyTypes.FORM,
    fields: [makePair('name', 'Ada L'), makePair('off', '1', false)],
};

const RAW_BODY: RequestBody = { bodyType: RequestBodyTypes.RAW, text: '<a/>', contentType: ' text/xml ' };

describe('buildOutgoingRequest', () => {
    describe('the URL', () => {
        it.each([
            {
                name: 'sends the query of the URL as typed',
                url: 'https://api.example.com/users?sort=a%20b&flag',
                expected: 'https://api.example.com/users?sort=a%20b&flag',
            },
            {
                name: 'lets the browser escape what the URL cannot carry',
                url: 'https://api.example.com/users?q=a b',
                expected: 'https://api.example.com/users?q=a%20b',
            },
        ])('$name', ({ url, expected }) => {
            expect(getOutgoing({ url }).url).toBe(expected);
        });

        it('adds nothing from the table: it only mirrors the query of the URL', () => {
            const url = 'https://api.example.com/users';
            const query = [makePair('page', '2'), makePair('off', '1', false)];

            expect(getOutgoing({ url, query }).url).toBe(url);
        });

        it.each([
            { name: 'a relative URL', url: '/users' },
            { name: 'a URL with an unresolved variable', url: '{{baseUrl}}/users' },
            { name: 'a URL of another scheme', url: 'ftp://example.com/file' },
        ])('refuses $name', ({ url }) => {
            expect(buildOutgoingRequest(makeApiRequest({ url })).ok).toBe(false);
        });
    });

    describe('the headers', () => {
        it('sends enabled headers with trimmed names and leaves out those the browser drops', () => {
            const headers = [
                makePair(' X-Trace ', '1'),
                makePair('Cookie', 'a=1'),
                makePair('X-Off', '1', false),
                makePair('', 'no name'),
            ];

            expect(getOutgoing({ headers }).headers).toEqual([['X-Trace', '1']]);
        });

        it('hands the headers fetch() drops to a browser rule, joined the way HTTP joins them', () => {
            const headers = [
                makePair('Cookie', 'a=1'),
                makePair('User-Agent', 'Test'),
                makePair('cookie', 'b=2'),
                makePair('Sec-Fetch-Site', 'none'),
                makePair('Referer', 'https://a.example', false),
            ];

            expect(getOutgoing({ headers }).ruleHeaders).toEqual([
                { name: 'cookie', value: 'a=1; b=2' },
                { name: 'user-agent', value: 'Test' },
                { name: 'sec-fetch-site', value: 'none' },
            ]);
        });

        it('leaves the headers the browser builds itself to the browser', () => {
            const headers = [makePair('Host', 'other.example'), makePair('Content-Length', '5')];

            const outgoing = getOutgoing({ headers });

            expect(outgoing.headers).toEqual([]);

            expect(outgoing.ruleHeaders).toEqual([]);
        });

        it.each([
            { name: 'a name with a space', header: makePair('X Trace', '1') },
            { name: 'a value with a line break', header: makePair('X-Trace', 'a\nb') },
            { name: 'a rule header with a line break', header: makePair('Cookie', 'a\nb') },
        ])('refuses $name', ({ header }) => {
            expect(buildOutgoingRequest(makeApiRequest({ headers: [header] })).ok).toBe(false);
        });
    });

    describe('the body', () => {
        it.each([
            {
                name: 'JSON with its content type',
                body: JSON_BODY,
                expected: { body: '{"a":1}', contentType: 'application/json' },
            },
            {
                name: 'enabled form fields, URL-encoded',
                body: FORM_BODY,
                expected: { body: 'name=Ada+L', contentType: 'application/x-www-form-urlencoded' },
            },
            {
                name: 'raw text with its content type',
                body: RAW_BODY,
                expected: { body: '<a/>', contentType: 'text/xml' },
            },
        ])('sends $name', ({ body, expected }) => {
            const outgoing = getOutgoing({ method: HttpMethods.POST, body });

            expect(outgoing.body).toBe(expected.body);

            expect(outgoing.headers).toEqual([['content-type', expected.contentType]]);
        });

        it('lets a typed Content-Type win over the body format', () => {
            const headers = [makePair('Content-Type', 'application/vnd.api+json')];

            const outgoing = getOutgoing({ method: HttpMethods.POST, body: JSON_BODY, headers });

            expect(outgoing.headers).toEqual([['Content-Type', 'application/vnd.api+json']]);
        });

        it('leaves the content type of raw text without one to the browser', () => {
            const body: RequestBody = { bodyType: RequestBodyTypes.RAW, text: 'hi', contentType: '' };

            expect(getOutgoing({ method: HttpMethods.POST, body }).headers).toEqual([]);
        });

        it('sends no body without one', () => {
            expect(getOutgoing({})).not.toHaveProperty('body');
        });

        it('refuses a body on GET', () => {
            expect(buildOutgoingRequest(makeApiRequest({ body: JSON_BODY })).ok).toBe(false);
        });
    });

    it.each([
        { sendCookies: false, credentials: CredentialsModes.OMIT },
        { sendCookies: true, credentials: CredentialsModes.INCLUDE },
    ])('sends cookies only when turned on: $sendCookies', ({ sendCookies, credentials }) => {
        expect(getOutgoing({ sendCookies }).credentials).toBe(credentials);
    });
});
