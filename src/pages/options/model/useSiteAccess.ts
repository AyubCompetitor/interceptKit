import { useState } from 'react';

import { buildHostPattern } from '#entities/site';
import { requestHostAccess, useHostPatterns } from '#shared/platform';

export const useSiteAccess = () => {
    const patterns = useHostPatterns();
    const [isRequestFailed, setIsRequestFailed] = useState(false);

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
