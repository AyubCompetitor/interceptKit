import { useState } from 'react';

import type { Mock } from '#entities/mock';

export const useMockDeletion = (onMockDelete: (mock: Mock) => void) => {
    const [mockToDelete, setMockToDelete] = useState<NotRequired<Mock>>();

    const onDeleteRequest = (mock: Mock) => {
        setMockToDelete(mock);
    };

    const onDeleteCancel = () => {
        setMockToDelete(undefined);
    };

    const onDeleteConfirm = () => {
        const isWaiting = mockToDelete !== undefined;

        if (isWaiting) {
            onMockDelete(mockToDelete);
        }

        setMockToDelete(undefined);
    };

    return {
        mockToDelete,
        onDeleteRequest,
        onDeleteCancel,
        onDeleteConfirm,
    };
};
