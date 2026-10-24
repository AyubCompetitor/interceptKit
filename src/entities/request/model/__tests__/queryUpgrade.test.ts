import { describe, expect, it } from '@rstest/core';

import { HttpMethods } from '#shared/lib';

import { upgradeRequestQuery } from '../queryUpgrade.ts';
import { RequestBodyTypes, type ApiRequest } from '../request.ts';

import { makePair } from './mocks.ts';

const makeOldRequest = (overrides: Partial<ApiRequest>): ApiRequest => ({
    id: 'q1',
    method: HttpMethods.GET,
    url: 'https://api.example.com/users',
    query: [],
    headers: [],
    body: { bodyType: RequestBodyTypes.NONE },
    sendCookies: false,
    ...overrides,
});

describe('upgradeRequestQuery', () => {
    it('moves the parameters an old client added at sending into the URL', () => {
        const request = makeOldRequest({
            url: 'https://api.example.com/users?sort=name#top',
            query: [makePair('page', '2'), makePair('off', '1', false), makePair('q', 'a&b {{term}}')],
        });

        expect(upgradeRequestQuery(request)).toMatchObject({
            url: 'https://api.example.com/users?sort=name&page=2&q=a%26b {{term}}#top',
            query: [
                makePair('sort', 'name'),
                makePair('page', '2'),
                makePair('q', 'a%26b {{term}}'),
                makePair('off', '1', false),
            ],
        });
    });

    it('leaves a URL alone when nothing was added, and mirrors its query', () => {
        const request = makeOldRequest({ url: 'https://api.example.com/users?page=2' });

        expect(upgradeRequestQuery(request)).toMatchObject({
            url: 'https://api.example.com/users?page=2',
            query: [makePair('page', '2')],
        });
    });
});
