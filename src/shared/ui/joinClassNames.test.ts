import { describe, expect, it } from '@rstest/core';

import { joinClassNames } from './joinClassNames.ts';

describe('joinClassNames', () => {
    it('keeps only truthy class names', () => {
        expect(joinClassNames('button', false, undefined, null, '', 'block')).toBe('button block');
    });

    it('returns undefined when nothing is left, so no empty class attribute is rendered', () => {
        expect(joinClassNames(false, undefined)).toBeUndefined();
    });
});
