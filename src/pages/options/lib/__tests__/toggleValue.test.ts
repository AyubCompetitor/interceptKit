import { describe, expect, it } from '@rstest/core';

import { toggleValue } from '../toggleValue.ts';

describe('toggleValue', () => {
    it('adds a missing value at the end', () => {
        expect(toggleValue(['GET'], 'POST')).toEqual(['GET', 'POST']);
    });

    it('removes a present value', () => {
        expect(toggleValue(['GET', 'POST'], 'GET')).toEqual(['POST']);
    });
});
