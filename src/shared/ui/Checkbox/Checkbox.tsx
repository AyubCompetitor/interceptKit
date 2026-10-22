import type { ComponentProps, FC } from 'react';

import { joinClassNames } from '../joinClassNames.ts';

import styles from './Checkbox.module.css';

interface CheckboxProps extends Omit<ComponentProps<'input'>, 'type'> {
    /** Text next to the box, also its accessible name */
    label: string;
    /** Keeps the label for assistive technology only, for a box under a column title */
    isLabelHidden?: boolean;
}

export const Checkbox: FC<CheckboxProps> = ({ label, isLabelHidden = false, className, ...rest }) => (
    <label className={joinClassNames(styles.checkbox, className)}>
        <input className={styles.box} type='checkbox' {...rest} />
        <span className={joinClassNames(isLabelHidden && styles.hiddenLabel)}>{label}</span>
    </label>
);
