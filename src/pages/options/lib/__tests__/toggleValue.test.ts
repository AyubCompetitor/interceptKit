import { describe, expect, it } from '@rstest/core';

import { HttpMethods } from '#shared/lib';

import { toggleValue } from '../toggleValue.ts';

describe('toggleValue', () => {
    it('adds a missing value at the end', () => {
        expect(toggleValue([HttpMethods.GET], HttpMethods.POST)).toEqual([HttpMethods.GET, HttpMethods.POST]);
    });

    it('removes a present value', () => {
        expect(toggleValue([HttpMethods.GET, HttpMethods.POST], HttpMethods.GET)).toEqual([HttpMethods.POST]);
    });
});
