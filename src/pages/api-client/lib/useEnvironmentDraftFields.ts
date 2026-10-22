import type { ChangeEvent } from 'react';

import type { EnvironmentDraftChange, VariableDraft } from '../model/environmentDraft.ts';

export const useEnvironmentDraftFields = (onDraftChange: EnvironmentDraftChange) => {
    const onNameChange = (event: ChangeEvent<HTMLInputElement>) => {
        onDraftChange({ name: event.target.value });
    };

    const onVariablesChange = (variables: VariableDraft[]) => {
        onDraftChange({ variables });
    };

    return {
        onNameChange,
        onVariablesChange,
    };
};
