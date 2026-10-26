import type { FC } from 'react';

import { joinClassNames } from '../joinClassNames.ts';

import styles from './MethodLabel.module.css';
import { getMethodToneClass } from './methodTone.ts';

interface MethodLabelProps {
    /** HTTP method as it is sent */
    method: string;
    /** Extra class */
    className?: NotRequired<string>;
}

export const MethodLabel: FC<MethodLabelProps> = ({ method, className }) => (
    <span className={joinClassNames(styles.method, getMethodToneClass(method), className)}>{method}</span>
);
