import { useEffect, useState } from 'react';

import type { Store, StoredData } from '#shared/lib';

import { subscribeStoreData } from './storage.ts';

export const useStoreData = (name: Store) => {
    const [data, setData] = useState<StoredData>();

    useEffect(() => subscribeStoreData(name, setData), [name]);

    return data;
};
