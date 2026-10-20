import type { HTMLAttributes } from 'react';

import { joinClassNames } from '../joinClassNames.ts';

import styles from './Typography.module.css';
import {
    TypographyColors,
    TypographySizes,
    type TypographyColor,
    type TypographyElement,
    type TypographySize,
} from './types.ts';

interface TypographyProps extends Omit<HTMLAttributes<HTMLElement>, 'color'> {
    /** Element to render */
    as?: TypographyElement;
    /** Text color: hint for secondary text, danger for errors */
    color?: TypographyColor;
    /** Font size from the scale */
    size?: TypographySize;
}

const COLOR_CLASSES: Record<TypographyColor, NotRequired<string>> = {
    [TypographyColors.PRIMARY]: styles.primary,
    [TypographyColors.HINT]: styles.hint,
    [TypographyColors.DANGER]: styles.danger,
};

const SIZE_CLASSES: Record<TypographySize, NotRequired<string>> = {
    [TypographySizes.SMALL]: styles.small,
    [TypographySizes.MEDIUM]: styles.medium,
};

export const Typography: FCC<TypographyProps> = ({
    as: Element = 'p',
    color = TypographyColors.PRIMARY,
    size = TypographySizes.MEDIUM,
    className,
    children,
    ...rest
}) => (
    <Element
        className={joinClassNames(styles.typography, COLOR_CLASSES[color], SIZE_CLASSES[size], className)}
        {...rest}
    >
        {children}
    </Element>
);
