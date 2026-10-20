import { createHeaderOpDraft, updateHeaderOp, type HeaderOpDraft } from '../model/ruleDraft.ts';

/** Adds, changes and removes the rows of a header list */
export const useHeaderOpList = (ops: readonly HeaderOpDraft[], onOpsChange: (ops: HeaderOpDraft[]) => void) => {
    const onOpAdd = () => {
        onOpsChange([...ops, createHeaderOpDraft()]);
    };

    const onOpChange = (key: string, patch: Partial<HeaderOpDraft>) => {
        onOpsChange(updateHeaderOp(ops, key, patch));
    };

    const onOpRemove = (key: string) => {
        onOpsChange(ops.filter(op => op.key !== key));
    };

    return {
        onOpAdd,
        onOpChange,
        onOpRemove,
    };
};
