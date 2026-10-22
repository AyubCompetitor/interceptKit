import type { ChangeEvent } from 'react';

import type { MockHeaderChange, MockHeaderDraft } from '../model/mockDraft.ts';

/** Binds the controls of one header row to its draft */
export const useMockHeaderRow = (
    { rowId, enabled }: MockHeaderDraft,
    onChange: MockHeaderChange,
    onRemove: (rowId: string) => void,
) => {
    const onEnabledToggle = () => {
        onChange(rowId, { enabled: !enabled });
    };

    const onNameChange = (event: ChangeEvent<HTMLInputElement>) => {
        onChange(rowId, { name: event.target.value });
    };

    const onValueChange = (event: ChangeEvent<HTMLInputElement>) => {
        onChange(rowId, { value: event.target.value });
    };

    const onRowRemove = () => {
        onRemove(rowId);
    };

    return {
        onEnabledToggle,
        onNameChange,
        onValueChange,
        onRowRemove,
    };
};
