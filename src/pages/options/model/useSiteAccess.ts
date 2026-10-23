import { useState } from 'react';

import { buildHostPattern } from '#entities/site';
import { requestHostAccess, useHostPatterns } from '#shared/platform';

export const useSiteAccess = () => {
    const [isRequestFailed, setIsRequestFailed] = useState(false);
    const patterns = useHostPatterns();

    const onAccessRequest = (host: string) => {
        requestHostAccess(buildHostPattern(host, true))
            .then(() => setIsRequestFailed(false))
            .catch(() => setIsRequestFailed(true));
    };

    return {
        patterns,
        isRequestFailed,
        onAccessRequest,
    };
};
