import { useState } from 'react';

import { getMockPatterns, sitesItem, sitesRpc } from '#entities/site';
import { executeRpc } from '#shared/messaging';
import { revokeHostAccess, useHostPatterns, useStorageItem } from '#shared/platform';
import { useProcessAction } from '#shared/ui';

export const useSiteList = () => {
    const [isRemoveFailed, setIsRemoveFailed] = useState(false);
    const { isFailed: isMocksFailed, processAction } = useProcessAction();

    const patterns = useHostPatterns();
    const sites = useStorageItem(sitesItem);

    const mockPatterns = getMockPatterns(sites ?? [], patterns ?? []);
    const isLoading = sites === undefined;

    /** The browser answers false when it keeps the access, which is a failure too */
    const onSiteRemove = (pattern: string) => {
        revokeHostAccess(pattern)
            .then(isRemoved => setIsRemoveFailed(!isRemoved))
            .catch(() => setIsRemoveFailed(true));
    };

    const onSiteMocksToggle = (pattern: string) => {
        const mocks = !mockPatterns.includes(pattern);

        processAction(executeRpc(sitesRpc.setMocks, { pattern, mocks }));
    };

    return {
        patterns,
        mockPatterns,

        isLoading,
        isRemoveFailed,
        isMocksFailed,

        onSiteRemove,
        onSiteMocksToggle,
    };
};
