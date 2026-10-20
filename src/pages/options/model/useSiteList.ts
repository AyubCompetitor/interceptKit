import { useState } from 'react';

import { revokeHostAccess, useHostPatterns } from '#shared/platform';

export const useSiteList = () => {
    const patterns = useHostPatterns();
    const [isRemoveFailed, setIsRemoveFailed] = useState(false);

    const onSiteRemove = (pattern: string) => {
        revokeHostAccess(pattern)
            .then(isRemoved => setIsRemoveFailed(!isRemoved))
            .catch(() => setIsRemoveFailed(true));
    };

    return {
        patterns,
        isRemoveFailed,
        onSiteRemove,
    };
};
