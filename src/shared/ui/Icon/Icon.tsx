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

const ICON_SHAPES: Record<IconName, ReactNode> = {
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
    [IconNames.LOCK]: <path d='M5 9.5h10v7H5zM7 9.5V7a3 3 0 0 1 6 0v2.5M10 12.5v1.5' />,
    [IconNames.UNLOCK]: <path d='M5 9.5h10v7H5zM7 9.5V7a3 3 0 0 1 5.8-1.1M10 12.5v1.5' />,
    [IconNames.COPY]: <path d='M7.5 7.5h8v9h-8zM4.5 13V3.5h8' />,
    [IconNames.SAVE]: <path d='M4.5 4.5h9l2 2v9h-11zM7 4.5V8h5V4.5M7 15.5v-4h6v4' />,
    [IconNames.MORE]: (
        <path d='M4.25 10a.75.75 0 1 0 1.5 0a.75.75 0 1 0-1.5 0M9.25 10a.75.75 0 1 0 1.5 0a.75.75 0 1 0-1.5 0M14.25 10a.75.75 0 1 0 1.5 0a.75.75 0 1 0-1.5 0' />
    ),
    [IconNames.FOLDER]: <path d='M3.5 6V15.5h13V8H10L8.5 6z' />,
    [IconNames.INFO]: (
        <>
            <circle cx='10' cy='10' r='7' />
            <path d='M10 9v4.5M10 6.5v.25' />
        </>
    ),
    [IconNames.CHECK]: <path d='M4.5 10.5l3.5 3.5 7.5-8' />,
    [IconNames.DOWNLOAD]: <path d='M10 3.5v9M6 8.5l4 4 4-4M4 15.5h12' />,
    [IconNames.ERROR]: (
        <>
            <circle cx='10' cy='10' r='7' />
            <path d='M7.5 7.5l5 5M12.5 7.5l-5 5' />
        </>
    ),
    [IconNames.FILE]: <path d='M5.5 3.5h6l3 3v10h-9zM11.5 3.5v3h3M8 10.5h4M8 13h4' />,
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
