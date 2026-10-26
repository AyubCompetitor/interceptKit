import { lazy, Suspense, type FC } from 'react';

import { Button, ButtonSizes } from '../Button/index.ts';

import { useTranslation } from '#shared/i18n';
import { formatJsonText, noop } from '#shared/lib';

import styles from './CodeEditor.module.css';
import { CodeLanguages, type CodeLanguage } from './types.ts';

interface CodeEditorProps {
    /** Visible name of the editor, also the accessible name of its text */
    label: string;
    /** Short help under the editor */
    hint?: NotRequired<string>;
    /** Text in the editor */
    value: string;
    /** Language of the text */
    language: CodeLanguage;
    /** For viewing only */
    isReadOnly?: boolean;
    /** Whether {{templates}} stand out */
    isWithTemplates?: boolean;
    /** Height in lines that the editor keeps even when empty */
    minRows?: number;
    /** Lines shown before the editor scrolls */
    maxRows?: number;
    /** Called with the whole text after every change */
    onChange?: (value: string) => void;
}

const DEFAULT_ROWS = {
    MIN: 6,
    MAX: 20,
} as const;

const CodeEditorView = lazy(async () => {
    const module = await import('./CodeEditorView.tsx');

    return { default: module.CodeEditorView };
});

export const CodeEditor: FC<CodeEditorProps> = ({
    label,
    hint,
    value,
    language,
    isReadOnly = false,
    isWithTemplates = false,
    minRows = DEFAULT_ROWS.MIN,
    maxRows = DEFAULT_ROWS.MAX,
    onChange = noop,
}) => {
    const { t } = useTranslation();

    const isJson = language === CodeLanguages.JSON;
    const formattedJson = isJson ? formatJsonText(value) : undefined;

    const isFormatButtonAvailable = isJson && !isReadOnly;
    const isFormattable = formattedJson !== undefined && formattedJson !== value;

    const onFormat = () => {
        if (formattedJson === undefined) {
            return;
        }

        onChange(formattedJson);
    };

    return (
        <div className={styles.editor}>
            <span className={styles.label}>{label}</span>

            <Suspense
                fallback={
                    <div
                        className={styles.placeholder}
                        style={{ minHeight: `calc(${minRows}lh + 2 * var(--space-s) + 2px)` }}
                    />
                }
            >
                <CodeEditorView
                    settings={{ language, label, isReadOnly, isWithTemplates, minRows, maxRows }}
                    value={value}
                    onChange={onChange}
                />
            </Suspense>

            {hint && <span className={styles.hint}>{hint}</span>}

            {isFormatButtonAvailable && (
                <Button className={styles.format} disabled={!isFormattable} size={ButtonSizes.SMALL} onClick={onFormat}>
                    {t('codeEditorFormat')}
                </Button>
            )}
        </div>
    );
};
