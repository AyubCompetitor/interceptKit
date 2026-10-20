import { joinClassNames } from '../joinClassNames.ts';

import styles from './Field.module.css';

interface FieldProps {
    /** Visible name of the control */
    label: string;
    /** Extra class */
    className?: NotRequired<string>;
}

export const Field: FCC<FieldProps> = ({ label, className, children }) => (
    <label className={joinClassNames(styles.field, className)}>
        <span className={styles.label}>{label}</span>
        {children}
    </label>
);
