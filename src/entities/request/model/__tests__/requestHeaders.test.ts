import { describe, expect, it } from '@rstest/core';

import { isForbiddenHeader } from '../requestHeaders.ts';

describe('isForbiddenHeader', () => {
    it.each([
        { name: 'Cookie', value: 'a=1', isForbidden: true },
        { name: 'user-agent', value: 'probe', isForbidden: true },
        { name: ' Origin ', value: 'https://a.test', isForbidden: true },
        { name: 'Sec-Fetch-Mode', value: 'cors', isForbidden: true },
        { name: 'Proxy-Authorization', value: 'Basic x', isForbidden: true },
        { name: 'X-HTTP-Method-Override', value: 'get, trace', isForbidden: true },
        { name: 'X-HTTP-Method-Override', value: 'PATCH', isForbidden: false },
        { name: 'Authorization', value: 'Bearer x', isForbidden: false },
        { name: 'X-Custom', value: '1', isForbidden: false },
    ])('tells whether the browser drops $name: $value', ({ name, value, isForbidden }) => {
        expect(isForbiddenHeader(name, value)).toBe(isForbidden);
    });
});
