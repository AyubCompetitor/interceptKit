import { useEffect, useState } from 'react';

import type { Database, DatabaseStore } from '#shared/lib';

import { subscribeRecords } from './database.ts';

export const useDatabaseRecords = <T>(database: Database, store: DatabaseStore<T>) => {
    const [records, setRecords] = useState<NotRequired<T[]>>();

    useEffect(() => subscribeRecords(database, store, setRecords), [database, store]);

    return records;
};
