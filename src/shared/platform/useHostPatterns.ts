import { useEffect, useState } from 'react';

import { getHostPermissions, watchHostAccess } from './permissions.ts';

/** Host patterns the extension holds, sorted and kept current */
export const useHostPatterns = () => {
    const [patterns, setPatterns] = useState<NotRequired<string[]>>();

    useEffect(() => {
        /** Lives in the effect: an answer that arrives after cleanup is dropped */
        let isActive = true;

        const onPermissionsUpdate = (permissions: string[]) => {
            if (!isActive) {
                return;
            }

            setPatterns(permissions.toSorted());
        };

        const onPermissionsReload = () => {
            getHostPermissions()
                .then(onPermissionsUpdate)
                .catch(() => onPermissionsUpdate([]));
        };

        const stopWatching = watchHostAccess(onPermissionsReload);

        onPermissionsReload();

        return () => {
            isActive = false;
            stopWatching();
        };
    }, []);

    return patterns;
};
