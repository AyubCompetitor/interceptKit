import { describe, expect, it } from '@rstest/core';

import { removeMock, upsertMock } from '../mockList.ts';

import { makeCheckedMock } from './mocks.ts';

const USERS_MOCK = makeCheckedMock();

const ORDERS_MOCK = makeCheckedMock({ id: 'orders', name: 'Orders' });

describe('upsertMock', () => {
    it('adds a mock with a new id at the end', () => {
        expect(upsertMock([USERS_MOCK], ORDERS_MOCK)).toEqual([USERS_MOCK, ORDERS_MOCK]);
    });

    it('replaces the mock with the same id in place, keeping its priority', () => {
        const renamed = makeCheckedMock({ name: 'All users' });

        expect(upsertMock([USERS_MOCK, ORDERS_MOCK], renamed)).toEqual([renamed, ORDERS_MOCK]);
    });
});

describe('removeMock', () => {
    it('removes the mock with the id', () => {
        expect(removeMock([USERS_MOCK, ORDERS_MOCK], USERS_MOCK.id)).toEqual([ORDERS_MOCK]);
    });
});
