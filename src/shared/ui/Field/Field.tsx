import type { ReactNode } from 'react';

import { joinClassNames } from '../joinClassNames.ts';

import styles from './Field.module.css';

interface FieldProps {
    /** Visible name of the control */
    label: string;
    /** Short help under the control */
    hint?: NotRequired<string>;
    /** A button next to the label, such as an info tip; it stays out of the name of the control */
    labelAside?: ReactNode;
    /** Extra class */
    className?: NotRequired<string>;
}

/** A label that wraps its control, so the pair needs no ids */
export const Field: FCC<FieldProps> = ({ label, hint, labelAside, className, children }) => (
    <div className={joinClassNames(styles.field, !!labelAside && styles.isWithAside, className)}>
        <label className={styles.control}>
            <span className={styles.label}>{label}</span>
            {children}
        </label>

        {labelAside && <span className={styles.aside}>{labelAside}</span>}

        {hint && <span className={styles.hint}>{hint}</span>}
    </div>
);
