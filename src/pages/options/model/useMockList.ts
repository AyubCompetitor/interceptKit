import { useState } from 'react';

import { mocksItem, mocksRpc, type Mock } from '#entities/mock';
import { getMockPatterns, sitesItem } from '#entities/site';
import { executeRpc } from '#shared/messaging';
import { useHostPatterns, useStorageItem } from '#shared/platform';

export const useMockList = () => {
    const [isActionFailed, setIsActionFailed] = useState(false);

    const mocks = useStorageItem(mocksItem);
    const sites = useStorageItem(sitesItem);
    const patterns = useHostPatterns();

    const isLoading = !mocks || !sites || !patterns;
    const mockPatterns = getMockPatterns(sites ?? [], patterns ?? []);

    const onMockToggle = (mock: Mock) => {
        executeRpc(mocksRpc.save, { ...mock, enabled: !mock.enabled })
            .then(() => setIsActionFailed(false))
            .catch(() => setIsActionFailed(true));
    };

    const onMockDelete = (mock: Mock) => {
        executeRpc(mocksRpc.remove, { id: mock.id })
            .then(() => setIsActionFailed(false))
            .catch(() => setIsActionFailed(true));
    };

    return {
        mocks: mocks ?? [],
        mockPatterns,

        isLoading,
        isActionFailed,

        onMockToggle,
        onMockDelete,
    };
};
