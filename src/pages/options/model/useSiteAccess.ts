import { buildHostPattern } from '#entities/site';
import { requestHostAccess, useHostPatterns } from '#shared/platform';
import { useProcessAction } from '#shared/ui';

export const useSiteAccess = () => {
    const { isFailed: isRequestFailed, processAction } = useProcessAction();
    const patterns = useHostPatterns();

    const onAccessRequest = (host: string) => processAction(requestHostAccess(buildHostPattern(host, true)));

    return {
        patterns,
        isRequestFailed,
        onAccessRequest,
    };
};
