import { Checkbox, Flex, Spaces } from '#shared/ui';

import styles from './Checklist.module.css';

interface ChecklistProps<T extends string> {
    /** Caption of the group */
    legend: string;
    /** Every value, shown as is */
    values: readonly T[];
    /** Checked values */
    selected: readonly T[];
    /** Called with the value whose box was clicked */
    onToggle: (value: T) => void;
}

export const Checklist = <T extends string>({ legend, values, selected, onToggle }: ChecklistProps<T>) => (
    <fieldset className={styles.checklist}>
        <legend className={styles.legend}>{legend}</legend>
        <Flex gap={Spaces.S} isWrapped>
            {values.map(value => (
                <Checkbox
                    key={value}
                    checked={selected.includes(value)}
                    className={styles.option}
                    label={value}
                    onChange={() => onToggle(value)}
                />
            ))}
        </Flex>
    </fieldset>
);
