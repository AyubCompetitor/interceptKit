import { describe, expect, it } from '@rstest/core';

import { Locales } from '#shared/config';

import { createTFunction, formatMessage } from '../translator.ts';

describe('createTFunction', () => {
    it.each([
        { locale: Locales.en, expected: 'Settings' },
        { locale: Locales.ru, expected: 'Настройки' },
    ] as const)('returns the $locale message', ({ locale, expected }) => {
        expect(createTFunction(locale)('settingsTitle')).toBe(expected);
    });
});

describe('formatMessage', () => {
    it('replaces a named placeholder with its content, whatever the case', () => {
        const entry = { message: 'Hello, $User$!', placeholders: { user: { content: 'Ann' } } };

        expect(formatMessage(entry, [])).toBe('Hello, Ann!');
    });

    it('keeps an unknown placeholder as is', () => {
        expect(formatMessage({ message: 'Hi $who$' }, [])).toBe('Hi $who$');
    });

    it('fills numbered substitutions, also inside placeholder content', () => {
        const entry = { message: '$COUNT$ of $2', placeholders: { count: { content: '$1' } } };

        expect(formatMessage(entry, ['3', '5'])).toBe('3 of 5');
    });

    it.each([
        { message: 'Price: $$5', expected: 'Price: $5' },
        { message: 'Missing: $3', expected: 'Missing: ' },
    ])('$message -> $expected', ({ message, expected }) => {
        expect(formatMessage({ message }, ['a'])).toBe(expected);
    });
});
