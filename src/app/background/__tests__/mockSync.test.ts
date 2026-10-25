import { describe, expect, it } from '@rstest/core';

import { DEFAULT_SETTINGS, Features } from '#entities/config';
import { mapMockToPageMock, MockBodyTypes, type Mock } from '#entities/mock';
import type { Site } from '#entities/site';
import { Sources, SyntaxTypes } from '#shared/lib';

import { selectMockDelivery, type MockState } from '../mockSync.ts';

const EXAMPLE_PATTERN = '*://*.example.com/*';

const USERS_MOCK: Mock = {
    id: 'users',
    name: 'Users',
    enabled: true,
    source: Sources.USER,
    match: { url: { syntaxType: SyntaxTypes.FILTER, value: '/api/users' } },
    response: {
        status: 200,
        headers: [],
        bodyType: MockBodyTypes.JSON,
        body: '[]',
        delayMs: 0,
    },
};

const MOCK_SITE: Site = {
    pattern: EXAMPLE_PATTERN,
    mocks: true,
};

const makeState = (overrides: Partial<MockState> = {}): MockState => ({
    mocks: [USERS_MOCK],
    sites: [MOCK_SITE],
    settings: DEFAULT_SETTINGS,
    policy: {},
    grantedPatterns: [EXAMPLE_PATTERN],
    ...overrides,
});

const NO_DELIVERY = {
    patterns: [],
    mocks: [],
};

describe('selectMockDelivery', () => {
    it('serves active mocks on granted sites with mocks on', () => {
        expect(selectMockDelivery(makeState())).toEqual({
            patterns: [EXAMPLE_PATTERN],
            mocks: [mapMockToPageMock(USERS_MOCK)],
        });
    });

    it('leaves disabled mocks out', () => {
        const disabledMock = { ...USERS_MOCK, id: 'off', enabled: false };

        expect(selectMockDelivery(makeState({ mocks: [disabledMock, USERS_MOCK] })).mocks).toHaveLength(1);
    });

    it.each([
        {
            name: 'interception is switched off',
            state: makeState({ settings: { ...DEFAULT_SETTINGS, enabled: false } }),
        },
        { name: 'the policy disables mocks', state: makeState({ policy: { disabledFeatures: [Features.MOCKS] } }) },
        { name: 'the policy forbids user mocks', state: makeState({ policy: { allowUserRules: false } }) },
        { name: 'no mock is enabled', state: makeState({ mocks: [{ ...USERS_MOCK, enabled: false }] }) },
        { name: 'no site has mocks on', state: makeState({ sites: [{ ...MOCK_SITE, mocks: false }] }) },
        { name: 'the site is no longer granted', state: makeState({ grantedPatterns: [] }) },
        { name: 'the policy does not allow the site', state: makeState({ policy: { allowedHosts: ['example.com'] } }) },
    ])('serves nothing when $name', ({ state }) => {
        expect(selectMockDelivery(state)).toEqual(NO_DELIVERY);
    });
});
