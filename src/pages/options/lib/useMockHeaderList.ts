import { createMockHeaderDraft, updateMockHeader, type MockHeaderDraft } from '../model/mockDraft.ts';

/** Adds, changes and removes the rows of the mock's response headers */
export const useMockHeaderList = (
    headers: readonly MockHeaderDraft[],
    onHeadersChange: (headers: MockHeaderDraft[]) => void,
) => {
    const onHeaderAdd = () => {
        onHeadersChange([...headers, createMockHeaderDraft()]);
    };

    const onHeaderChange = (rowId: string, patch: Partial<MockHeaderDraft>) => {
        onHeadersChange(updateMockHeader(headers, rowId, patch));
    };

    const onHeaderRemove = (rowId: string) => {
        onHeadersChange(headers.filter(header => header.rowId !== rowId));
    };

    return {
        onHeaderAdd,
        onHeaderChange,
        onHeaderRemove,
    };
};
