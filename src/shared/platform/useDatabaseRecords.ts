import { useEffect, useState } from 'react';

import type { Database, DatabaseStore } from '#shared/lib';

import { readRecords, watchRecords } from './database.ts';

/** Every valid record of the store, reloaded whenever a page of the extension changes them */
export const useDatabaseRecords = <T>(database: Database, store: DatabaseStore<T>) => {
    const [records, setRecords] = useState<NotRequired<T[]>>();

    useEffect(() => {
        /** Lives in the effect: records that arrive after cleanup are dropped */
        let isActive = true;

        const onRecordsUpdate = (nextRecords: T[]) => {
            if (!isActive) {
                return;
            }

            setRecords(nextRecords);
        };

        const onRecordsReload = () => {
            readRecords(database, store)
                .then(onRecordsUpdate)
                .catch(() => onRecordsUpdate([]));
        };

        const stopWatching = watchRecords(database, store, onRecordsReload);

        onRecordsReload();

        return () => {
            isActive = false;
            stopWatching();
        };
    }, [database, store]);

    return records;
};
