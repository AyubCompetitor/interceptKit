import type { FC, ReactNode } from 'react';

import { joinClassNames } from '../joinClassNames.ts';

import styles from './Icon.module.css';
import { IconNames, type IconName } from './types.ts';

interface IconProps {
    /** Which icon to draw */
    name: IconName;
    /** Extra class */
    className?: NotRequired<string>;
}

/** Outline icons on a 20 × 20 grid, drawn with the current text color */
const ICON_SHAPES: Record<IconName, ReactNode> = {
    /** A request line that forks off to a new destination */
    [IconNames.BRAND]: <path d='M3 13.5h4.5c3 0 3.5-7 7-7H17M14.5 4l2.5 2.5L14.5 9M7.5 13.5H17' />,
    [IconNames.PLUS]: <path d='M10 4.5v11M4.5 10h11' />,
    [IconNames.EDIT]: <path d='M12.5 4.5l3 3L8 15H5v-3zM11 6l3 3' />,
    [IconNames.DELETE]: <path d='M4.5 6h11M8 6V4.5h4V6M6 6l.7 9.5h6.6L14 6' />,
    [IconNames.CLOSE]: <path d='M5.5 5.5l9 9M14.5 5.5l-9 9' />,
    [IconNames.WARNING]: <path d='M10 3.5l7 12.5H3zM10 8.5V12M10 14.25v.25' />,
    [IconNames.CHEVRON]: <path d='M6 8l4 4 4-4' />,
    [IconNames.RULES]: <path d='M4 5.5h12M4 10h12M4 14.5h7' />,
    [IconNames.SITES]: (
        <>
            <circle cx='10' cy='10' r='6.5' />
            <path d='M3.5 10h13M10 3.5c1.8 1.8 2.7 4 2.7 6.5s-.9 4.7-2.7 6.5c-1.8-1.8-2.7-4-2.7-6.5s.9-4.7 2.7-6.5z' />
        </>
    ),
    [IconNames.SETTINGS]: (
        <>
            <path d='M4 6h7M15 6h1M4 14h1M9 14h7' />
            <circle cx='13' cy='6' r='2' />
            <circle cx='7' cy='14' r='2' />
        </>
    ),
    [IconNames.MOCKS]: (
        <path d='M7.5 4C6 4 5.5 4.8 5.5 6v1.5c0 1-.5 2.5-1.5 2.5 1 0 1.5 1.5 1.5 2.5V14c0 1.2.5 2 2 2M12.5 4c1.5 0 2 .8 2 2v1.5c0 1 .5 2.5 1.5 2.5-1 0-1.5 1.5-1.5 2.5V14c0 1.2-.5 2-2 2' />
    ),
    [IconNames.POLICY]: <path d='M10 3l5.5 2v4.5c0 3.5-2.4 6-5.5 7.5-3.1-1.5-5.5-4-5.5-7.5V5z' />,
    [IconNames.TRANSFER]: <path d='M6.5 4v12M3.5 7l3-3 3 3M13.5 16V4M10.5 13l3 3 3-3' />,
    [IconNames.API_CLIENT]: <path d='M4 6l4 4-4 4M10 14.5h6' />,
};

export const Icon: FC<IconProps> = ({ name, className }) => (
    <svg
        aria-hidden='true'
        className={joinClassNames(styles.icon, className)}
        fill='none'
        stroke='currentColor'
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth={1.75}
        viewBox='0 0 20 20'
    >
        {ICON_SHAPES[name]}
    </svg>
);
