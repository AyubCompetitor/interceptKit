import { requestHostAccess, useHostPatterns } from '#shared/platform';
import { useProcessAction } from '#shared/ui';

export const useSiteAccess = () => {
    const { isFailed: isRequestFailed, processAction } = useProcessAction();
    const patterns = useHostPatterns();

    const onAccessRequest = (pattern: string) => processAction(requestHostAccess(pattern));

    return {
        patterns,
        isRequestFailed,
        onAccessRequest,
    };
};
