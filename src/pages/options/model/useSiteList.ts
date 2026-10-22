import { useState } from 'react';

import { getMockPatterns, sitesItem, sitesRpc } from '#entities/site';
import { executeRpc } from '#shared/messaging';
import { revokeHostAccess, useHostPatterns, useStorageItem } from '#shared/platform';

export const useSiteList = () => {
    const patterns = useHostPatterns();
    const sites = useStorageItem(sitesItem);
    const [isRemoveFailed, setIsRemoveFailed] = useState(false);
    const [isMocksFailed, setIsMocksFailed] = useState(false);

    const isLoading = sites === undefined;
    const mockPatterns = getMockPatterns(sites ?? [], patterns ?? []);

    const onSiteRemove = (pattern: string) => {
        revokeHostAccess(pattern)
            .then(isRemoved => setIsRemoveFailed(!isRemoved))
            .catch(() => setIsRemoveFailed(true));
    };

    const onSiteMocksToggle = (pattern: string) => {
        const mocks = !mockPatterns.includes(pattern);

        executeRpc(sitesRpc.setMocks, { pattern, mocks })
            .then(() => setIsMocksFailed(false))
            .catch(() => setIsMocksFailed(true));
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
