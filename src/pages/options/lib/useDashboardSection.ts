import { useSyncExternalStore } from 'react';

import { getHash, parseDashboardSection, watchHashChange } from './dashboard.ts';

/** The section in the address bar: links switch sections, and a reload or a bookmark keeps the place */
export const useDashboardSection = () => {
    const hash = useSyncExternalStore(watchHashChange, getHash);

    const section = parseDashboardSection(hash);

    return { section };
};
