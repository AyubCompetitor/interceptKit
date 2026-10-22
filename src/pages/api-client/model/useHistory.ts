import { useState } from 'react';

import { apiClientDatabase, historyStore, sortHistoryEntries, type HistoryEntry } from '#entities/request';
import { clearRecords, deleteRecord, useDatabaseRecords } from '#shared/platform';

/** Sent requests, newest first; the list follows changes made on any page of the extension */
export const useHistory = () => {
    const records = useDatabaseRecords(apiClientDatabase, historyStore);
    const [isActionFailed, setIsActionFailed] = useState(false);

    const entries = sortHistoryEntries(records ?? []);
    const isLoading = !records;

    const onEntryDelete = (entry: HistoryEntry) => {
        deleteRecord(apiClientDatabase, historyStore, entry.id)
            .then(() => setIsActionFailed(false))
            .catch(() => setIsActionFailed(true));
    };

    const onHistoryClear = () => {
        clearRecords(apiClientDatabase, historyStore)
            .then(() => setIsActionFailed(false))
            .catch(() => setIsActionFailed(true));
    };

    return {
        entries,

        isLoading,
        isActionFailed,

        onEntryDelete,
        onHistoryClear,
    };
};
