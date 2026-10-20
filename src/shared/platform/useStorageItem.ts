import { useEffect, useState } from 'react';

import type { StoreItem } from '#shared/lib';

import { readItem, watchItem } from './storage.ts';

/** Current value of a storage item */
export const useStorageItem = <T>(item: StoreItem<T>) => {
    const [value, setValue] = useState<NotRequired<T>>();

    useEffect(() => {
        /** Lives in the effect: a value that arrives after cleanup is dropped */
        let isActive = true;

        const onValueUpdate = (nextValue: T) => {
            if (!isActive) {
                return;
            }

            setValue(nextValue);
        };

        const stopWatching = watchItem(item, onValueUpdate);

        readItem(item)
            .then(onValueUpdate)
            .catch(() => onValueUpdate(item.fallback));

        return () => {
            isActive = false;
            stopWatching();
        };
    }, [item]);

    return value;
};
