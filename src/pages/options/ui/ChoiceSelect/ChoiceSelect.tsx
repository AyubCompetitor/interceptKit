import type { ChangeEvent } from 'react';

import { useTranslation, type MessageKey } from '#shared/i18n';

interface ChoiceSelectProps<T extends string> {
    /** Accessible name, for a select without a visible label */
    label?: string;
    /** Selected choice */
    value: T;
    /** Every choice with the message key of its label, in display order */
    labels: Readonly<Record<T, MessageKey>>;
    /** Called with the new choice */
    onChange: (value: T) => void;
}

export const ChoiceSelect = <T extends string>({ label, value, labels, onChange }: ChoiceSelectProps<T>) => {
    const { t } = useTranslation();

    const isChoice = (candidate: string): candidate is T => Object.hasOwn(labels, candidate);

    const choices = Object.keys(labels).filter(isChoice);

    const onSelectChange = (event: ChangeEvent<HTMLSelectElement>) => {
        if (isChoice(event.target.value)) {
            onChange(event.target.value);
        }
    };

    return (
        <select aria-label={label} value={value} onChange={onSelectChange}>
            {choices.map(choice => (
                <option key={choice} value={choice}>
                    {t(labels[choice])}
                </option>
            ))}
        </select>
    );
};
