import { afterEach, beforeEach, describe, expect, it, rs } from '@rstest/core';

import { defineStoreItem, number, object, Stores, string } from '#shared/lib';

import {
    prepareWrite,
    readItem,
    subscribeItem,
    watchItem,
    writeItem,
    writeItems,
    writeStoreData,
} from '../storage/storage.ts';

import { installFakeStorage } from './mocks.ts';

const counterItem = defineStoreItem({
    key: 'counter',
    area: Stores.LOCAL,
    fallback: { value: 0 },
    validator: object({ value: number({ min: 0 }) }),
});

const labelItem = defineStoreItem({
    key: 'label',
    area: Stores.LOCAL,
    fallback: '',
    validator: string({ maxLength: 10 }),
});

const tick = (): Promise<void> => new Promise(resolve => setTimeout(resolve, 1));

describe('storage adapter', () => {
    let data: Record<string, unknown>;

    beforeEach(() => {
        data = installFakeStorage();
    });

    afterEach(() => {
        rs.restoreAllMocks();
    });

    describe('readItem', () => {
        it('returns the fallback for a missing key', async () => {
            expect(await readItem(counterItem)).toEqual({ value: 0 });
        });

        it('degrades corrupted data to the fallback instead of crashing', async () => {
            data['counter'] = { value: -5, injected: '<script>' };

            expect(await readItem(counterItem)).toEqual({ value: 0 });
        });
    });

    describe('writeItem', () => {
        it('refuses to persist invalid values', async () => {
            await writeItem(counterItem, { value: 3 });

            expect(data['counter']).toEqual({ value: 3 });

            await expect(writeItem(counterItem, { value: -1 })).rejects.toThrow('Refusing to store');

            expect(data['counter']).toEqual({ value: 3 });
        });
    });

    describe('writeItems', () => {
        it('writes several items in one call', async () => {
            await writeItems([prepareWrite(counterItem, { value: 1 }), prepareWrite(labelItem, 'one')]);

            expect(data).toMatchObject({ counter: { value: 1 }, label: 'one' });
        });

        it('writes nothing when one of the values is invalid', () => {
            expect(() => prepareWrite(counterItem, { value: -1 })).toThrow('Refusing to store');

            expect(data).toEqual({});
        });
    });

    describe('watchItem', () => {
        it('notifies with validated values until unsubscribed', async () => {
            const seen: unknown[] = [];

            const stopWatching = watchItem(counterItem, value => seen.push(value));

            await writeItem(counterItem, { value: 1 });

            stopWatching();

            await writeItem(counterItem, { value: 2 });

            expect(seen).toEqual([{ value: 1 }]);
        });
    });

    describe('subscribeItem', () => {
        it('calls with the stored value, then with each change until stopped', async () => {
            const seen: unknown[] = [];

            data['counter'] = { value: 1 };

            const stopSubscription = subscribeItem(counterItem, value => seen.push(value));

            await tick();
            await writeItem(counterItem, { value: 2 });

            stopSubscription();

            await writeItem(counterItem, { value: 3 });

            expect(seen).toEqual([{ value: 1 }, { value: 2 }]);
        });

        it('drops a read that resolves after stop', async () => {
            const seen: unknown[] = [];

            const stopSubscription = subscribeItem(counterItem, value => seen.push(value));

            stopSubscription();

            await tick();

            expect(seen).toEqual([]);
        });
    });

    describe('writeStoreData', () => {
        it('replaces a whole area for migrations, removing dropped keys', async () => {
            data['old'] = 1;
            data['keep'] = 1;

            await writeStoreData(Stores.LOCAL, { keep: 2, added: true });

            expect(data).toEqual({ keep: 2, added: true });
        });
    });
});
