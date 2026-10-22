import { describe, expect, it } from '@rstest/core';

import {
    createKeyValueRow,
    mapKeyValueToRow,
    mapRowToKeyValue,
    updateKeyValueRow,
    type KeyValueRow,
} from '../keyValueRows.ts';

const ROWS: KeyValueRow[] = [
    { rowId: 'a', key: 'X-A', value: '1', enabled: true },
    { rowId: 'b', key: 'X-B', value: '2', enabled: true },
];

const PAIR = { key: 'page', value: '2', enabled: false };

describe('key-value rows', () => {
    it('start a new row empty and enabled with a fresh id', () => {
        const row = createKeyValueRow();

        expect(row).toMatchObject({ key: '', value: '', enabled: true });

        expect(row.rowId).not.toBe(createKeyValueRow().rowId);
    });

    it('turn a pair into a row and back unchanged', () => {
        expect(mapRowToKeyValue(mapKeyValueToRow(PAIR))).toEqual(PAIR);
    });

    it('change only the row with the id', () => {
        expect(updateKeyValueRow(ROWS, 'b', { enabled: false })).toEqual([ROWS[0], { ...ROWS[1], enabled: false }]);
    });
});
