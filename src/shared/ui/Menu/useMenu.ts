import { usePopoverAnchor } from '../usePopoverAnchor.ts';

import type { MenuAction } from './types.ts';

export const useMenu = () => {
    const { popoverId, popoverRef, anchorStyle } = usePopoverAnchor();

    const onActionSelect = (action: MenuAction) => {
        popoverRef.current?.hidePopover();
        action.onSelect();
    };

    return {
        menuId: popoverId,
        menuRef: popoverRef,
        anchorStyle,
        onActionSelect,
    };
};
