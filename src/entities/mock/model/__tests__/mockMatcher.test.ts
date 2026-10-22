import { describe, expect, it } from '@rstest/core';

import { HttpMethods, SyntaxTypes } from '#shared/lib';

import { buildMockMatchers, findPageMock, resolveRequestUrl } from '../mockMatcher.ts';

import { makePageMock, makeResponse, USERS_URL } from './mocks.ts';

const PAGE_URL = 'https://app.example.com/dashboard/';

const USERS_MOCK = makePageMock();

const POST_ONLY_MOCK = makePageMock({
    match: { url: { syntaxType: SyntaxTypes.FILTER, value: '/users' }, methods: [HttpMethods.POST] },
});

const SECOND_USERS_MOCK = makePageMock({ response: makeResponse({ status: 500 }) });

const ORDERS_REQUEST = {
    url: 'https://api.example.com/orders',
    method: HttpMethods.GET,
};

describe('findPageMock', () => {
    it('finds the mock whose pattern matches the URL', () => {
        const matchers = buildMockMatchers([USERS_MOCK]);

        expect(findPageMock(matchers, { url: `${USERS_URL}?page=2`, method: HttpMethods.GET })).toBe(USERS_MOCK);
    });

    it('finds nothing for another URL', () => {
        const matchers = buildMockMatchers([USERS_MOCK]);

        expect(findPageMock(matchers, ORDERS_REQUEST)).toBeUndefined();
    });

    it('lets the first matching mock win', () => {
        const matchers = buildMockMatchers([USERS_MOCK, SECOND_USERS_MOCK]);

        expect(findPageMock(matchers, { url: USERS_URL, method: HttpMethods.GET })).toBe(USERS_MOCK);
    });

    it.each([
        { name: 'the same method', method: HttpMethods.POST, isFound: true },
        { name: 'the method in lower case', method: 'post', isFound: true },
        { name: 'another method', method: HttpMethods.GET, isFound: false },
    ])('answers $name of a method list: $isFound', ({ method, isFound }) => {
        const matchers = buildMockMatchers([POST_ONLY_MOCK]);

        expect(findPageMock(matchers, { url: USERS_URL, method }) !== undefined).toBe(isFound);
    });
});

describe('resolveRequestUrl', () => {
    it.each([
        {
            name: 'a relative path against the page',
            rawUrl: 'api/users',
            url: 'https://app.example.com/dashboard/api/users',
        },
        { name: 'a root path against the page', rawUrl: '/api/users', url: 'https://app.example.com/api/users' },
        { name: 'an absolute URL as is', rawUrl: USERS_URL, url: USERS_URL },
        { name: 'a URL without its fragment', rawUrl: `${USERS_URL}?page=2#top`, url: `${USERS_URL}?page=2` },
    ])('resolves $name', ({ rawUrl, url }) => {
        expect(resolveRequestUrl(rawUrl, PAGE_URL)).toBe(url);
    });

    it('gives nothing for a URL the browser cannot parse', () => {
        expect(resolveRequestUrl('http://[broken', PAGE_URL)).toBeUndefined();
    });
});
