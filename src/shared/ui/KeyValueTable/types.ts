import type { MessageKey } from '#shared/i18n';
import type { KeyValue } from '#shared/lib';

/** Message keys of the texts of a key-value table */
export interface KeyValueTableLabels {
    /** Title of the key column, also the accessible name of each key field */
    readonly key: MessageKey;
    /** Title of the value column, also the accessible name of each value field */
    readonly value: MessageKey;
    /** Accessible name of the switch of a row */
    readonly enabled: MessageKey;
    /** Text of the button that adds a row */
    readonly add: MessageKey;
    /** Accessible name of the button that deletes a row */
    readonly remove: MessageKey;
    /** Shown instead of the table while it has no rows */
    readonly empty: MessageKey;
}

/** Changes the fields of the row with the id */
export type KeyValueRowChange = (rowId: string, patch: Partial<KeyValue>) => void;
