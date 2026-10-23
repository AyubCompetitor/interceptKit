import { useState } from 'react';

import type { Mock } from '#entities/mock';

/** Whether the editor is open and which mock it shows; none means a new mock */
export const useMockEditor = () => {
    const [editedMock, setEditedMock] = useState<NotRequired<Mock>>();
    const [isEditorOpen, setIsEditorOpen] = useState(false);

    const onMockCreate = () => {
        setEditedMock(undefined);
        setIsEditorOpen(true);
    };

    const onMockEdit = (mock: Mock) => {
        setEditedMock(mock);
        setIsEditorOpen(true);
    };

    const onEditorClose = () => {
        setIsEditorOpen(false);
    };

    return {
        editedMock,
        isEditorOpen,
        onMockCreate,
        onMockEdit,
        onEditorClose,
    };
};
