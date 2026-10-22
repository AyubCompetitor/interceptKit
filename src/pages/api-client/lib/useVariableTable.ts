import {
    createVariableDraft,
    updateVariableDraft,
    type VariableDraft,
    type VariableDraftPatch,
} from '../model/environmentDraft.ts';

/** Adds, changes and removes the variables of the edited environment */
export const useVariableTable = (
    variables: readonly VariableDraft[],
    onVariablesChange: (variables: VariableDraft[]) => void,
) => {
    const onVariableAdd = () => {
        onVariablesChange([...variables, createVariableDraft()]);
    };

    const onVariableChange = (rowId: string, patch: VariableDraftPatch) => {
        onVariablesChange(updateVariableDraft(variables, rowId, patch));
    };

    const onVariableRemove = (rowId: string) => {
        onVariablesChange(variables.filter(variable => variable.rowId !== rowId));
    };

    return {
        onVariableAdd,
        onVariableChange,
        onVariableRemove,
    };
};
