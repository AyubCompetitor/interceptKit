import { afterEach, beforeEach, describe, expect, it, rs } from '@rstest/core';

import { defineStore, number, object, Stores } from '#shared/lib';

import { readItem, replaceArea, watchItem, writeItem } from './storage.ts';

interface Change {
    /** Value after the change */
    newValue?: unknown;
    /** Value before the change */
    oldValue?: unknown;
}

type Listener = (changes: Record<string, Change>, area: string) => void;

/** In-memory stand-in for the parts of chrome.storage the adapter uses */
const installFakeStorage = (): Record<string, unknown> => {
    const data: Record<string, unknown> = {};
    const listeners = new Set<Listener>();

    const local = {
        get: async (key: Nullable<string>) => {
            if (key === null) {
                return { ...data };
            }

            return Object.hasOwn(data, key) ? { [key]: data[key] } : {};
        },
        set: async (items: Record<string, unknown>) => {
            for (const [key, newValue] of Object.entries(items)) {
                const oldValue = data[key];

                data[key] = newValue;

                for (const listener of listeners) {
                    listener({
                        [key]: {
                            newValue,
                            oldValue
                        }
                    }, Stores.LOCAL);
                }
            }
        },
        remove: async (keys: readonly string[]) => {
            for (const key of keys) {
                Reflect.deleteProperty(data, key);
            }
        },
    };

    const onChanged = {
        addListener: (listener: Listener) => listeners.add(listener),
        removeListener: (listener: Listener) => listeners.delete(listener),
    };

    Object.defineProperty(globalThis, 'chrome', {
        configurable: true,
        value: {
            storage: {
                local,
                onChanged
            }
        }
    });

    return data;
};

const counterItem = defineStore({
    area: Stores.LOCAL,
    key: 'counter',
    validator: object({ value: number({ min: 0 }) }),
    fallback: { value: 0 },
});

describe('storage adapter', () => {
    let data: Record<string, unknown>;

    beforeEach(() => {
        data = installFakeStorage();
    });

    afterEach(() => {
        rs.restoreAllMocks();
    });

    it('returns the fallback for a missing key', async () => {
        expect(await readItem(counterItem)).toEqual({ value: 0 });
    });

    it('degrades corrupted data to the fallback instead of crashing', async () => {
        const warn = rs.spyOn(console, 'warn').mockImplementation(() => undefined);

        data['counter'] = { value: -5, injected: '<script>' };

        expect(await readItem(counterItem)).toEqual({ value: 0 });

        expect(warn).toHaveBeenCalledTimes(1);
    });

    it('refuses to persist invalid values', async () => {
        await writeItem(counterItem, { value: 3 });

        expect(data['counter']).toEqual({ value: 3 });

        await expect(writeItem(counterItem, { value: -1 })).rejects.toThrow('Refusing to store');

        expect(data['counter']).toEqual({ value: 3 });
    });

    it('notifies watchers with validated values until unsubscribed', async () => {
        const seen: unknown[] = [];
        const stopWatching = watchItem(counterItem, value => seen.push(value));

        await writeItem(counterItem, { value: 1 });
        stopWatching();
        await writeItem(counterItem, { value: 2 });

        expect(seen).toEqual([{ value: 1 }]);
    });

    it('replaces a whole area for migrations, removing dropped keys', async () => {
        data['old'] = 1;
        data['keep'] = 1;

        await replaceArea(Stores.LOCAL, { keep: 2, added: true });

        expect(data).toEqual({ keep: 2, added: true });
    });
});
