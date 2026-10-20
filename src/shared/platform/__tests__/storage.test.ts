import { afterEach, beforeEach, describe, expect, it, rs } from '@rstest/core';

import { defineStoreItem, number, object, Stores } from '#shared/lib';

import { readItem, writeStoreData, watchItem, writeItem } from '../storage.ts';

import { installFakeStorage } from './mocks.ts';

const counterItem = defineStoreItem({
    key: 'counter',
    area: Stores.LOCAL,
    fallback: { value: 0 },
    validator: object({ value: number({ min: 0 }) }),
});

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
            const warn = rs.spyOn(console, 'warn').mockImplementation(() => undefined);

            data['counter'] = { value: -5, injected: '<script>' };

            expect(await readItem(counterItem)).toEqual({ value: 0 });

            expect(warn).toHaveBeenCalledTimes(1);
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

    describe('writeStoreData', () => {
        it('replaces a whole area for migrations, removing dropped keys', async () => {
            data['old'] = 1;
            data['keep'] = 1;

            await writeStoreData(Stores.LOCAL, { keep: 2, added: true });

            expect(data).toEqual({ keep: 2, added: true });
        });
    });
});
