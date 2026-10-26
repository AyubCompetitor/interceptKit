import type { FC } from 'react';

import { joinClassNames } from '../joinClassNames.ts';

import styles from './Spinner.module.css';

interface SpinnerProps {
    /** Extra class */
    className?: NotRequired<string>;
}

export const Spinner: FC<SpinnerProps> = ({ className }) => (
    <span aria-hidden='true' className={joinClassNames(styles.spinner, className)} />
);
