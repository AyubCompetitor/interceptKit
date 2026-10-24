import { apiClientDatabase, historyStore, sortHistoryEntries, type HistoryEntry } from '#entities/request';
import { clearRecords, deleteRecord, useDatabaseRecords } from '#shared/platform';
import { useProcessAction } from '#shared/ui';

/** Sent requests, newest first; the list follows changes made on any page of the extension */
export const useHistory = () => {
    const { isFailed: isActionFailed, processAction } = useProcessAction();
    const records = useDatabaseRecords(apiClientDatabase, historyStore);

    const entries = sortHistoryEntries(records ?? []);
    const isLoading = !records;

    const onEntryDelete = (entry: HistoryEntry) =>
        processAction(deleteRecord(apiClientDatabase, historyStore, entry.id));

    const onHistoryClear = () => processAction(clearRecords(apiClientDatabase, historyStore));

    return {
        entries,
        isLoading,
        isActionFailed,
        onEntryDelete,
        onHistoryClear,
    };
};
