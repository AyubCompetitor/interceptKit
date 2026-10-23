import { useEffect, useState } from 'react';

import type { StoreItem } from '#shared/lib';

import { subscribeItem } from './storage.ts';

export const useStorageItem = <T>(item: StoreItem<T>) => {
    const [value, setValue] = useState<NotRequired<T>>();

    useEffect(() => subscribeItem(item, setValue), [item]);

    return value;
};
