import { describe, expect, it } from '@rstest/core';

import { splitTemplates } from '../splitTemplates.ts';

describe('splitTemplates', () => {
    it('cuts the text around each template and keeps their places', () => {
        expect(splitTemplates('{{baseUrl}}/users?id={{id}}')).toEqual([
            { text: '{{baseUrl}}', start: 0, isTemplate: true },
            { text: '/users?id=', start: 11, isTemplate: false },
            { text: '{{id}}', start: 21, isTemplate: true },
        ]);
    });

    it.each([
        { name: 'text without templates', text: 'https://api.example.com' },
        { name: 'an unfinished template', text: '{{baseUrl' },
    ])('keeps $name whole', ({ text }) => {
        expect(splitTemplates(text)).toEqual([{ text, start: 0, isTemplate: false }]);
    });

    it('gives nothing for an empty text', () => {
        expect(splitTemplates('')).toEqual([]);
    });
});
