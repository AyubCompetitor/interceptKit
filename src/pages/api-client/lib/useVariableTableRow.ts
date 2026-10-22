import type { ChangeEvent } from 'react';

import type { VariableDraft, VariableDraftChange } from '../model/environmentDraft.ts';

/** Binds the controls of one variable row to its draft */
export const useVariableTableRow = (
    { rowId, enabled, secret }: VariableDraft,
    onChange: VariableDraftChange,
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

    const onSecretToggle = () => {
        onChange(rowId, { secret: !secret });
    };

    const onRowRemove = () => {
        onRemove(rowId);
    };

    return {
        onEnabledToggle,
        onKeyChange,
        onValueChange,
        onSecretToggle,
        onRowRemove,
    };
};
