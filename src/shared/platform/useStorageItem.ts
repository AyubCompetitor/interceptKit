import { useEffect, useState } from 'react';

import type { StoreItem } from '#shared/lib';

import { readItem, watchItem } from './storage.ts';

/** Current value of a storage item */
export const useStorageItem = <T>(item: StoreItem<T>) => {
    const [value, setValue] = useState<NotRequired<T>>();

    useEffect(() => {
        let isActive = true;

        const stopWatching = watchItem(item, next => {
            if (isActive) {
                setValue(next);
            }
        });

        readItem(item).then(
            initial => {
                if (isActive) {
                    setValue(initial);
                }
            },
            (error: unknown) => {
                console.error(`[storage] cannot read ${item.key}`, error);

                if (isActive) {
                    setValue(item.fallback);
                }
            },
        );

        return () => {
            isActive = false;
            stopWatching();
        };
    }, [item]);

    return value;
};
