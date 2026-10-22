import type { KeyValue } from './http.ts';
import { getRandomUUID } from './identifier.ts';

/** A pair as a form edits it: a header, a query parameter or a form field */
export interface KeyValueRow extends KeyValue {
    /** React key of the row, never saved */
    readonly rowId: string;
}

export const createKeyValueRow = (): KeyValueRow => ({
    rowId: getRandomUUID(),
    key: '',
    value: '',
    enabled: true,
});

export const mapKeyValueToRow = (pair: KeyValue): KeyValueRow => ({
    rowId: getRandomUUID(),
    key: pair.key,
    value: pair.value,
    enabled: pair.enabled,
});

export const mapRowToKeyValue = (row: KeyValueRow): KeyValue => ({
    key: row.key,
    value: row.value,
    enabled: row.enabled,
});

export const updateKeyValueRow = (
    rows: readonly KeyValueRow[],
    rowId: string,
    patch: Partial<KeyValue>,
): KeyValueRow[] => {
    return rows.map(row => {
        if (row.rowId !== rowId) {
            return row;
        }

        return { ...row, ...patch };
    });
};
