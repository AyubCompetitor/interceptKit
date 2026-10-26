import type { ComponentProps, FC } from 'react';

import { joinClassNames } from '../joinClassNames.ts';

import { splitTemplates } from './splitTemplates.ts';
import styles from './TemplateInput.module.css';
import { useMirrorScroll } from './useMirrorScroll.ts';

interface TemplateInputProps extends Omit<ComponentProps<'input'>, 'value'> {
    /** The text, whose {{templates}} stand out */
    value: string;
}

/** The input draws no text of its own: a copy behind it shows the same text with {{templates}} coloured */
export const TemplateInput: FC<TemplateInputProps> = ({ value, className, ...rest }) => {
    const { mirrorRef, onInputScroll } = useMirrorScroll();

    return (
        <span className={styles.field}>
            <span aria-hidden='true' className={joinClassNames(styles.mirror, className)} ref={mirrorRef}>
                {splitTemplates(value).map(part => (
                    <span key={part.start} className={joinClassNames(part.isTemplate && styles.template)}>
                        {part.text}
                    </span>
                ))}
            </span>

            <input
                {...rest}
                className={joinClassNames(styles.input, className)}
                value={value}
                onScroll={onInputScroll}
            />
        </span>
    );
};
