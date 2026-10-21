import { useTranslation, type MessageKey, type TFunction } from '#shared/i18n';
import { Typography, TypographyColors, TypographySizes } from '#shared/ui';

import styles from './Checklist.module.css';

interface ChecklistProps<T extends string> {
    /** Caption of the group */
    legend: string;
    /** What an empty choice means */
    hint?: string;
    /** Every value, in display order */
    values: readonly T[];
    /** Message keys of the labels; without them the values are shown as is */
    labels?: Readonly<Record<T, MessageKey>>;
    /** Checked values */
    selected: readonly T[];
    /** Called with the value whose chip was clicked */
    onToggle: (value: T) => void;
}

const getLabel = <T extends string>(t: TFunction, value: T, labels?: Readonly<Record<T, MessageKey>>): string => {
    if (labels === undefined) {
        return value;
    }

    return t(labels[value]);
};

/** Toggle chips over native checkboxes */
export const Checklist = <T extends string>({
    legend,
    hint,
    values,
    labels,
    selected,
    onToggle,
}: ChecklistProps<T>) => {
    const { t } = useTranslation();

    return (
        <fieldset className={styles.checklist}>
            <legend className={styles.legend}>{legend}</legend>

            <div className={styles.chips}>
                {values.map(value => (
                    <label key={value} className={styles.chip}>
                        <input
                            checked={selected.includes(value)}
                            className={styles.input}
                            type='checkbox'
                            onChange={() => onToggle(value)}
                        />
                        {getLabel(t, value, labels)}
                    </label>
                ))}
            </div>

            {hint && (
                <Typography color={TypographyColors.HINT} size={TypographySizes.SMALL}>
                    {hint}
                </Typography>
            )}
        </fieldset>
    );
};
