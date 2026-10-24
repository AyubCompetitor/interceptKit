import { describe, expect, it } from '@rstest/core';

import { getErrorText } from '../getErrorText.ts';

describe('getErrorText', () => {
    it.each([
        { name: 'an error', error: new Error('broken'), text: 'broken' },
        { name: 'anything else', error: 'broken', text: 'unknown error' },
    ])('gives the message of $name', ({ error, text }) => {
        expect(getErrorText(error)).toBe(text);
    });
});
