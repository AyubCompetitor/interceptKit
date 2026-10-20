import { describe, expect, it } from '@rstest/core';

import { urlPattern } from '../urlPattern.ts';
import { validate } from '../validation.ts';

describe('urlPattern', () => {
    it.each([
        { syntaxType: 'filter', value: '||api.example.com/v1/^' },
        { syntaxType: 'regex', value: '^https://api\\.example\\.com/' },
    ])('accepts a $syntaxType pattern', pattern => {
        expect(validate(urlPattern, pattern).ok).toBe(true);
    });

    it.each([
        { reason: 'a non-ASCII filter', pattern: { syntaxType: 'filter', value: '||пример.рф' } },
        { reason: 'a broken regex', pattern: { syntaxType: 'regex', value: '(' } },
        { reason: 'a filter starting with ||*', pattern: { syntaxType: 'filter', value: '||*.example.com' } },
    ])('rejects $reason', ({ pattern }) => {
        expect(validate(urlPattern, pattern).ok).toBe(false);
    });
});
