import { describe, expect, it } from '@rstest/core';

import { formatJsonText, isJsonText } from '../jsonText.ts';

describe('formatJsonText', () => {
    it('lays JSON out with four-space indents', () => {
        expect(formatJsonText('{"users":[1,2]}')).toBe('{\n    "users": [\n        1,\n        2\n    ]\n}');
    });

    it.each([{ text: '{"a":' }, { text: '' }, { text: 'plain text' }])('gives nothing for "$text"', ({ text }) => {
        expect(formatJsonText(text)).toBeUndefined();
    });
});

describe('isJsonText', () => {
    it.each([
        { text: '{"a":1}', isJson: true },
        { text: 'null', isJson: true },
        { text: '{"a":', isJson: false },
    ])('tells whether $text is JSON: $isJson', ({ text, isJson }) => {
        expect(isJsonText(text)).toBe(isJson);
    });
});
