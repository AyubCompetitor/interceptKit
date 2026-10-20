import { Stores } from '#shared/lib';

interface StorageChange {
    /** Value after the change */
    newValue?: unknown;
    /** Value before the change */
    oldValue?: unknown;
}

type ChangeListener = (changes: Record<string, StorageChange>, area: string) => void;

/** In-memory stand-in for the parts of chrome.storage the adapter uses, returns the stored data */
export const installFakeStorage = (): Record<string, unknown> => {
    const data: Record<string, unknown> = {};
    const listeners = new Set<ChangeListener>();

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
                    listener(
                        {
                            [key]: {
                                newValue,
                                oldValue,
                            },
                        },
                        Stores.LOCAL,
                    );
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
        addListener: (listener: ChangeListener) => listeners.add(listener),
        removeListener: (listener: ChangeListener) => listeners.delete(listener),
    };

    Object.defineProperty(globalThis, 'chrome', {
        configurable: true,
        value: {
            storage: {
                local,
                onChanged,
            },
        },
    });

    return data;
};
