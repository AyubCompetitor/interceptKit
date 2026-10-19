import type { HTMLAttributes } from 'react';

import { joinClassNames } from '../joinClassNames.ts';
import { Spaces, type Space } from '../tokens.ts';

import styles from './Flex.module.css';
import type { FlexAlign, FlexDirection, FlexElement, FlexJustify } from './types.ts';

interface FlexProps extends HTMLAttributes<HTMLElement> {
    /** Element to render */
    as?: FlexElement;
    /** Main axis */
    direction?: FlexDirection;
    /** Cross-axis alignment of the items */
    align?: FlexAlign;
    /** Main-axis distribution of the items */
    justify?: FlexJustify;
    /** Space between the items, from the spacing scale */
    gap?: Space;
    /** Lets the items wrap onto new lines */
    isWrapped?: boolean;
}

const ALIGN_CLASSES: Record<FlexAlign, NotRequired<string>> = {
    start: styles.alignStart,
    center: styles.alignCenter,
    end: styles.alignEnd,
    stretch: styles.alignStretch,
    baseline: styles.alignBaseline,
};

const JUSTIFY_CLASSES: Record<FlexJustify, NotRequired<string>> = {
    start: styles.justifyStart,
    center: styles.justifyCenter,
    end: styles.justifyEnd,
    between: styles.justifyBetween,
};

const GAP_CLASSES: Record<Space, NotRequired<string>> = {
    [Spaces.XS]: styles.gapXs,
    [Spaces.S]: styles.gapS,
    [Spaces.M]: styles.gapM,
    [Spaces.L]: styles.gapL,
    [Spaces.XL]: styles.gapXl,
    [Spaces.XXL]: styles.gapXxl,
};

export const Flex: FCC<FlexProps> = ({
    as: Element = 'div',
    direction = 'row',
    align,
    justify,
    gap,
    isWrapped = false,
    className,
    children,
    ...rest
}) => (
    <Element
        className={joinClassNames(
            styles.flex,
            direction === 'column' && styles.column,
            align && ALIGN_CLASSES[align],
            justify && JUSTIFY_CLASSES[justify],
            gap && GAP_CLASSES[gap],
            isWrapped && styles.wrapped,
            className,
        )}
        {...rest}
    >
        {children}
    </Element>
);
