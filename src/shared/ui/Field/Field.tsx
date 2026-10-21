import { joinClassNames } from '../joinClassNames.ts';

import styles from './Field.module.css';

interface FieldProps {
    /** Visible name of the control */
    label: string;
    /** Short help under the control */
    hint?: NotRequired<string>;
    /** Extra class */
    className?: NotRequired<string>;
}

/** A label that wraps its control, so the pair needs no ids */
export const Field: FCC<FieldProps> = ({ label, hint, className, children }) => (
    <div className={joinClassNames(styles.field, className)}>
        <label className={styles.control}>
            <span className={styles.label}>{label}</span>
            {children}
        </label>
        {hint && <span className={styles.hint}>{hint}</span>}
    </div>
);
