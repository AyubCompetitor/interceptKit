import { describe, expect, it } from '@rstest/core';

import { isDuplicateValues } from '../isDuplicateValues.ts';

describe('isDuplicateValues', () => {
    it.each([
        { values: ['a', 'b', 'a'], expected: true },
        { values: ['a', 'b'], expected: false },
        { values: [], expected: false },
    ])('$values -> $expected', ({ values, expected }) => {
        expect(isDuplicateValues(values)).toBe(expected);
    });
});
