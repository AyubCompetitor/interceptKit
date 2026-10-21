import type { ComponentProps, FC } from 'react';

import { joinClassNames } from '../joinClassNames.ts';

import styles from './Switch.module.css';

interface SwitchProps extends Omit<ComponentProps<'input'>, 'type' | 'role'> {
    /** Text next to the switch, also its accessible name */
    label: string;
    /** Keeps the label for assistive technology only */
    isLabelHidden?: boolean;
}

export const Switch: FC<SwitchProps> = ({ label, isLabelHidden = false, className, ...rest }) => (
    <label className={joinClassNames(styles.switch, className)}>
        <input className={styles.input} role='switch' type='checkbox' {...rest} />

        <span aria-hidden='true' className={styles.track} />

        <span className={joinClassNames(styles.label, isLabelHidden && styles.hiddenLabel)}>{label}</span>
    </label>
);
