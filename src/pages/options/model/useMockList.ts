import { mocksItem, mocksRpc, type Mock } from '#entities/mock';
import { getMockPatterns, sitesItem } from '#entities/site';
import { executeRpc } from '#shared/messaging';
import { useHostPatterns, useStorageItem } from '#shared/platform';
import { useProcessAction } from '#shared/ui';

export const useMockList = () => {
    const { isFailed: isActionFailed, processAction } = useProcessAction();

    const mocks = useStorageItem(mocksItem);
    const sites = useStorageItem(sitesItem);
    const patterns = useHostPatterns();

    const isLoading = !mocks || !sites || !patterns;
    const mockPatterns = getMockPatterns(sites ?? [], patterns ?? []);

    const onMockToggle = (mock: Mock) => processAction(executeRpc(mocksRpc.save, { ...mock, enabled: !mock.enabled }));

    const onMockDelete = (mock: Mock) => processAction(executeRpc(mocksRpc.remove, { id: mock.id }));

    return {
        mocks: mocks ?? [],
        mockPatterns,

        isLoading,
        isActionFailed,

        onMockToggle,
        onMockDelete,
    };
};
