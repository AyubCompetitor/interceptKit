import type { Site } from '../site.ts';

export const EXAMPLE_PATTERN = '*://*.example.com/*';

export const OTHER_PATTERN = '*://other.test/*';

export const makeSite = (overrides: Partial<Site> = {}): Site => ({
    pattern: EXAMPLE_PATTERN,
    mocks: true,
    ...overrides,
});
