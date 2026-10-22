import type { ChangeEvent } from 'react';

import type { KeyValueRow } from '#shared/lib';

import type { KeyValueRowChange } from './types.ts';

/** Binds the controls of one row to its pair */
export const useKeyValueTableRow = (
    { rowId, enabled }: KeyValueRow,
    onChange: KeyValueRowChange,
    onRemove: (rowId: string) => void,
) => {
    const onEnabledToggle = () => {
        onChange(rowId, { enabled: !enabled });
    };

    const onKeyChange = (event: ChangeEvent<HTMLInputElement>) => {
        onChange(rowId, { key: event.target.value });
    };

    const onValueChange = (event: ChangeEvent<HTMLInputElement>) => {
        onChange(rowId, { value: event.target.value });
    };

    const onRowRemove = () => {
        onRemove(rowId);
    };

    return {
        onEnabledToggle,
        onKeyChange,
        onValueChange,
        onRowRemove,
    };
};
