import type { ChangeEvent } from 'react';

import type { HeaderOpChange, HeaderOpDraft } from '../model/ruleDraft.ts';

import type { HeaderOperation } from '#entities/rule';

/** Binds the controls of one header row to its draft */
export const useHeaderOpRow = ({ key }: HeaderOpDraft, onChange: HeaderOpChange, onRemove: (key: string) => void) => {
    const onNameChange = (event: ChangeEvent<HTMLInputElement>) => {
        onChange(key, { name: event.target.value });
    };

    const onOperationChange = (operation: HeaderOperation) => {
        onChange(key, { operation });
    };

    const onValueChange = (event: ChangeEvent<HTMLInputElement>) => {
        onChange(key, { value: event.target.value });
    };

    const onRowRemove = () => {
        onRemove(key);
    };

    return {
        onNameChange,
        onOperationChange,
        onValueChange,
        onRowRemove,
    };
};
