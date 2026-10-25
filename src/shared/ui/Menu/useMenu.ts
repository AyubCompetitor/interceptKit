import { useId, useRef } from 'react';

import type { MenuAction, MenuAnchorStyle } from './types.ts';

/** An anchor name is a dashed ident: the characters useId adds around its number are left out */
const NON_IDENT_RGX = /[^\w-]/g;

export const useMenu = () => {
    const menuId = useId();
    const menuRef = useRef<HTMLDivElement>(null);

    const anchorStyle: MenuAnchorStyle = { '--menu-anchor': `--menu-${menuId.replace(NON_IDENT_RGX, '')}` };

    const onActionSelect = (action: MenuAction) => {
        menuRef.current?.hidePopover();
        action.onSelect();
    };

    return {
        menuId,
        menuRef,
        anchorStyle,
        onActionSelect,
    };
};
