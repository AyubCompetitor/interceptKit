import { createKeyValueRow, updateKeyValueRow, type KeyValue, type KeyValueRow } from '#shared/lib';

/** Adds, changes and removes the rows of a key-value table */
export const useKeyValueTable = (rows: readonly KeyValueRow[], onRowsChange: (rows: KeyValueRow[]) => void) => {
    const onRowAdd = () => {
        onRowsChange([...rows, createKeyValueRow()]);
    };

    const onRowChange = (rowId: string, patch: Partial<KeyValue>) => {
        onRowsChange(updateKeyValueRow(rows, rowId, patch));
    };

    const onRowRemove = (rowId: string) => {
        onRowsChange(rows.filter(row => row.rowId !== rowId));
    };

    return {
        onRowAdd,
        onRowChange,
        onRowRemove,
    };
};
