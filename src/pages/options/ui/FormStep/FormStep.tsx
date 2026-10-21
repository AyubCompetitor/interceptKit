import { useId } from 'react';

import styles from './FormStep.module.css';

interface FormStepProps {
    /** Heading of the step, phrased as the question it answers */
    title: string;
}

export const FormStep: FCC<FormStepProps> = ({ title, children }) => {
    const titleId = useId();

    return (
        <section aria-labelledby={titleId} className={styles.step}>
            <h3 id={titleId}>{title}</h3>

            {children}
        </section>
    );
};
