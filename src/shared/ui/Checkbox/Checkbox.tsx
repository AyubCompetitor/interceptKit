import type { ComponentProps, FC } from 'react';

import { joinClassNames } from '../joinClassNames.ts';

import styles from './Checkbox.module.css';

interface CheckboxProps extends Omit<ComponentProps<'input'>, 'type'> {
    /** Text next to the box, also its accessible name */
    label: string;
}

export const Checkbox: FC<CheckboxProps> = ({ label, className, ...rest }) => (
    <label className={joinClassNames(styles.checkbox, className)}>
        <input className={styles.box} type='checkbox' {...rest} />
        {label}
    </label>
);
