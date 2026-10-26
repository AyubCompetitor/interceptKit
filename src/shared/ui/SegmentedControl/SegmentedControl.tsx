import { useId, type ChangeEvent, type ReactNode } from 'react';

import { joinClassNames } from '../joinClassNames.ts';

import { useTranslation, type MessageKey } from '#shared/i18n';

import styles from './SegmentedControl.module.css';

interface SegmentedControlProps<T extends string> {
    /** Name of the group */
    legend: string;
    /** Keeps the name for assistive technology only, when a heading nearby already says it */
    isLegendHidden?: boolean;
    /** Less room around each label, for a narrow place */
    isCompact?: boolean;
    /** A button next to the legend, such as an info tip; it stays out of the name of the group */
    legendAside?: ReactNode;
    /** Selected choice */
    value: T;
    /** Every choice with the message key of its label, in display order */
    labels: Readonly<Record<T, MessageKey>>;
    /** Called with the new choice */
    onChange: (value: T) => void;
}

export const SegmentedControl = <T extends string>({
    legend,
    isLegendHidden = false,
    isCompact = false,
    legendAside,
    value,
    labels,
    onChange,
}: SegmentedControlProps<T>) => {
    const name = useId();
    const { t } = useTranslation();

    const isLegendInRow = !!legendAside && !isLegendHidden;

    const isChoice = (candidate: string): candidate is T => Object.hasOwn(labels, candidate);
    const choices = Object.keys(labels).filter(isChoice);

    const onRadioChange = (event: ChangeEvent<HTMLInputElement>) => {
        if (!isChoice(event.target.value)) {
            return;
        }

        onChange(event.target.value);
    };

    return (
        <fieldset className={styles.group}>
            <legend className={joinClassNames(styles.legend, (isLegendHidden || isLegendInRow) && styles.hiddenLegend)}>
                {legend}
            </legend>

            {isLegendInRow && (
                <div className={styles.legendRow}>
                    <span aria-hidden='true' className={styles.legend}>
                        {legend}
                    </span>

                    {legendAside}
                </div>
            )}

            <div className={styles.track}>
                {choices.map(choice => (
                    <label key={choice} className={joinClassNames(styles.segment, isCompact && styles.isCompact)}>
                        <input
                            checked={choice === value}
                            className={styles.input}
                            name={name}
                            type='radio'
                            value={choice}
                            onChange={onRadioChange}
                        />

                        {t(labels[choice])}
                    </label>
                ))}
            </div>
        </fieldset>
    );
};
