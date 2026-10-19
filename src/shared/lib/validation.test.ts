import { describe, expect, it } from '@rstest/core';

import {
    array,
    boolean,
    discriminatedUnion,
    formatIssues,
    literal,
    nothing,
    number,
    object,
    oneOf,
    optional,
    refine,
    string,
    validate,
} from './validation.ts';

describe('primitives', () => {
    it('checks string length and pattern', () => {
        const slug = string({ minLength: 2, maxLength: 4, pattern: /^[a-z]+$/ });

        expect(validate(slug, 'abc')).toEqual({ ok: true, value: 'abc' });

        expect(validate(slug, 'a').ok).toBe(false);

        expect(validate(slug, 'abcde').ok).toBe(false);

        expect(validate(slug, 'AB').ok).toBe(false);

        expect(validate(slug, 42).ok).toBe(false);
    });

    it('rejects non-finite and out-of-range numbers', () => {
        const port = number({ integer: true, min: 1, max: 65_535 });

        expect(validate(port, 8080).ok).toBe(true);

        expect(validate(port, 0).ok).toBe(false);

        expect(validate(port, 1.5).ok).toBe(false);

        expect(validate(port, Number.NaN).ok).toBe(false);

        expect(validate(port, Number.POSITIVE_INFINITY).ok).toBe(false);
    });

    it('matches literals and enumerations exactly', () => {
        expect(validate(literal('a'), 'a').ok).toBe(true);

        expect(validate(literal('a'), 'A').ok).toBe(false);

        expect(validate(oneOf(['x', 'y']), 'y')).toEqual({ ok: true, value: 'y' });

        expect(validate(oneOf(['x', 'y']), 'z').ok).toBe(false);

        expect(validate(boolean(), 'true').ok).toBe(false);
    });

    it('accepts only an absent value for parameterless calls', () => {
        expect(validate(nothing, undefined)).toEqual({ ok: true, value: null });

        expect(validate(nothing, null)).toEqual({ ok: true, value: null });

        expect(validate(nothing, {}).ok).toBe(false);
    });
});

describe('object', () => {
    const user = object({ name: string(), age: optional(number()) });

    it('returns a clean copy with required and present optional keys', () => {
        expect(validate(user, { name: 'Ann' })).toEqual({ ok: true, value: { name: 'Ann' } });

        expect(validate(user, { name: 'Ann', age: 3 })).toEqual({ ok: true, value: { name: 'Ann', age: 3 } });
    });

    it('rejects unknown keys, including __proto__ from parsed JSON', () => {
        const result = validate(user, JSON.parse('{"name":"Ann","__proto__":{"admin":true}}'));

        expect(result.ok).toBe(false);

        if (!result.ok) {
            expect(result.issues).toEqual([{ path: '$.__proto__', message: 'unknown property' }]);
        }
    });

    it('never reads inherited properties', () => {
        const withConstructor = object({ constructor: optional(string()) });

        expect(validate(withConstructor, {})).toEqual({ ok: true, value: {} });
    });

    it('reports every problem with its path', () => {
        const result = validate(user, { name: 1, age: 'x', extra: true });

        expect(result.ok).toBe(false);

        if (!result.ok) {
            expect(formatIssues(result.issues)).toBe(
                '$.extra: unknown property; $.name: expected a string; $.age: expected a finite number',
            );
        }
    });
});

describe('array', () => {
    it('validates items and limits length', () => {
        const tags = array(string(), { maxLength: 2 });
        const result = validate(tags, ['a', 1]);

        expect(validate(tags, ['a', 'b']).ok).toBe(true);

        expect(validate(tags, ['a', 'b', 'c']).ok).toBe(false);

        expect(result.ok).toBe(false);

        if (!result.ok) {
            expect(result.issues[0]?.path).toBe('$[1]');
        }
    });
});

describe('discriminatedUnion', () => {
    const shape = discriminatedUnion('kind', {
        circle: object({ kind: literal('circle'), radius: number({ min: 0 }) }),
        square: object({ kind: literal('square'), side: number({ min: 0 }) }),
    });

    it('dispatches by tag', () => {
        expect(validate(shape, { kind: 'circle', radius: 1 }).ok).toBe(true);

        expect(validate(shape, { kind: 'square', side: 2 }).ok).toBe(true);

        expect(validate(shape, { kind: 'square', radius: 1 }).ok).toBe(false);
    });

    it('rejects unknown and inherited tags', () => {
        expect(validate(shape, { kind: 'triangle' }).ok).toBe(false);

        expect(validate(shape, { kind: 'toString' }).ok).toBe(false);

        expect(validate(shape, {}).ok).toBe(false);
    });
});

describe('refine', () => {
    it('adds business rules after structural checks', () => {
        const even = refine(number({ integer: true }), value => (value % 2 === 0 ? undefined : 'must be even'));

        expect(validate(even, 4).ok).toBe(true);

        expect(validate(even, 3)).toEqual({ ok: false, issues: [{ path: '$', message: 'must be even' }] });

        expect(validate(even, 'x').ok).toBe(false);
    });
});
