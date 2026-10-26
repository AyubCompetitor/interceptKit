import { useId, useRef, type CSSProperties } from 'react';

/** The anchor name a button and its popover share */
export type PopoverAnchorStyle = CSSProperties & Record<'--popover-anchor', string>;

/** An anchor name is a dashed ident: the characters useId adds around its number are left out */
const NON_IDENT_RGX = /[^\w-]/g;

/** The name goes on as a custom property through CSSOM, which the style-src policy allows */
export const usePopoverAnchor = () => {
    const popoverId = useId();
    const popoverRef = useRef<HTMLDivElement>(null);

    const anchorStyle: PopoverAnchorStyle = {
        '--popover-anchor': `--popover-${popoverId.replace(NON_IDENT_RGX, '')}`,
    };

    return {
        popoverId,
        popoverRef,
        anchorStyle,
    };
};
