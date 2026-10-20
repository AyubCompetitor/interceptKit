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
} from '../validation.ts';

describe('string', () => {
    const slug = string({ minLength: 2, maxLength: 4, pattern: /^[a-z]+$/ });

    it('returns a valid string as is', () => {
        expect(validate(slug, 'abc')).toEqual({ ok: true, value: 'abc' });
    });

    it.each([
        { input: 'a', reason: 'too short' },
        { input: 'abcde', reason: 'too long' },
        { input: 'AB', reason: 'wrong format' },
        { input: 42, reason: 'not a string' },
    ])('rejects $input: $reason', ({ input }) => {
        expect(validate(slug, input).ok).toBe(false);
    });
});

describe('number', () => {
    const port = number({ integer: true, min: 1, max: 65_535 });

    it('accepts an integer in range', () => {
        expect(validate(port, 8080).ok).toBe(true);
    });

    it.each([
        { input: 0, reason: 'below the minimum' },
        { input: 1.5, reason: 'not an integer' },
        { input: Number.NaN, reason: 'not finite' },
        { input: Number.POSITIVE_INFINITY, reason: 'not finite' },
    ])('rejects $input: $reason', ({ input }) => {
        expect(validate(port, input).ok).toBe(false);
    });
});

describe('literal', () => {
    it.each([
        { input: 'a', expected: true },
        { input: 'A', expected: false },
    ])('$input -> $expected', ({ input, expected }) => {
        expect(validate(literal('a'), input).ok).toBe(expected);
    });
});

describe('oneOf', () => {
    it('returns the matched value', () => {
        expect(validate(oneOf(['x', 'y']), 'y')).toEqual({ ok: true, value: 'y' });
    });

    it('rejects a value outside the list', () => {
        expect(validate(oneOf(['x', 'y']), 'z').ok).toBe(false);
    });
});

describe('boolean', () => {
    it('rejects the string "true"', () => {
        expect(validate(boolean(), 'true').ok).toBe(false);
    });
});

describe('nothing', () => {
    it.each([undefined, null])('accepts %s as no value', input => {
        expect(validate(nothing, input)).toEqual({ ok: true, value: null });
    });

    it('rejects an object', () => {
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
    const tags = array(string(), { maxLength: 2 });

    it('accepts a list within the limit', () => {
        expect(validate(tags, ['a', 'b']).ok).toBe(true);
    });

    it('rejects a list over the limit', () => {
        expect(validate(tags, ['a', 'b', 'c']).ok).toBe(false);
    });

    it('reports the path of a broken item', () => {
        const result = validate(tags, ['a', 1]);

        expect(result.ok).toBe(false);

        if (!result.ok) {
            expect(result.issues[0]?.path).toBe('$[1]');
        }
    });
});

describe('discriminatedUnion', () => {
    const shape = discriminatedUnion('shapeType', {
        circle: object({ shapeType: literal('circle'), radius: number({ min: 0 }) }),
        square: object({ shapeType: literal('square'), side: number({ min: 0 }) }),
    });

    it.each([
        { shapeType: 'circle', radius: 1 },
        { shapeType: 'square', side: 2 },
    ])('dispatches $shapeType by its tag', input => {
        expect(validate(shape, input).ok).toBe(true);
    });

    it.each([
        { name: 'fields of another variant', input: { shapeType: 'square', radius: 1 } },
        { name: 'an unknown tag', input: { shapeType: 'triangle' } },
        { name: 'an inherited tag', input: { shapeType: 'toString' } },
        { name: 'a missing tag', input: {} },
    ])('rejects $name', ({ input }) => {
        expect(validate(shape, input).ok).toBe(false);
    });
});

describe('refine', () => {
    const even = refine(number({ integer: true }), value => (value % 2 === 0 ? undefined : 'must be even'));

    it('accepts a value that passes the check', () => {
        expect(validate(even, 4).ok).toBe(true);
    });

    it('reports the check message at the value path', () => {
        expect(validate(even, 3)).toEqual({ ok: false, issues: [{ path: '$', message: 'must be even' }] });
    });

    it('runs the structural check first', () => {
        expect(validate(even, 'x').ok).toBe(false);
    });
});
