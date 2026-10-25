import { useState } from 'react';

import { toggleValue } from '#shared/lib';

export const useCollapsedItems = () => {
    const [collapsedIds, setCollapsedIds] = useState<readonly string[]>([]);

    const onItemToggle = (itemId: string) => setCollapsedIds(current => toggleValue(current, itemId));

    return {
        collapsedIds,
        onItemToggle,
    };
};
