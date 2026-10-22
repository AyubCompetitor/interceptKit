import { describe, expect, it } from '@rstest/core';

import { getResponseBodyView, ResponseBodyViewTypes } from '../responseBody.ts';

import { makeResponse } from './mocks.ts';

describe('getResponseBodyView', () => {
    it.each([
        {
            name: 'lays JSON out',
            response: makeResponse(),
            view: { viewType: ResponseBodyViewTypes.JSON, text: '{\n    "a": 1\n}' },
        },
        {
            name: 'shows broken JSON as it came',
            response: makeResponse({ body: '{"a":' }),
            view: { viewType: ResponseBodyViewTypes.TEXT, text: '{"a":' },
        },
        {
            name: 'shows text as it came',
            response: makeResponse({ headers: [['content-type', 'text/html']], body: '<p>hi</p>' }),
            view: { viewType: ResponseBodyViewTypes.TEXT, text: '<p>hi</p>' },
        },
        {
            name: 'does not show an image',
            response: makeResponse({ headers: [['Content-Type', 'image/png']] }),
            view: { viewType: ResponseBodyViewTypes.BINARY, contentType: 'image/png' },
        },
        {
            name: 'tells that there is no body',
            response: makeResponse({ body: '', size: 0 }),
            view: { viewType: ResponseBodyViewTypes.EMPTY },
        },
    ])('$name', ({ response, view }) => {
        expect(getResponseBodyView(response)).toEqual(view);
    });
});
