import { lazy, Suspense, type FC } from 'react';

import { Button, ButtonSizes } from '../Button/index.ts';

import { useTranslation } from '#shared/i18n';

import styles from './CodeEditor.module.css';
import type { CodeLanguage } from './types.ts';
import { useCodeEditor } from './useCodeEditor.ts';

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
    /** Height in lines that the editor keeps even when empty */
    minRows?: number;
    /** Lines shown before the editor scrolls */
    maxRows?: number;
    /** Called with the whole text after every change; a read-only editor needs none */
    onChange?: (value: string) => void;
}

const DEFAULT_ROWS = {
    MIN: 6,
    MAX: 20,
} as const;

/** What a read-only editor does with changes it never makes */
const onTextIgnore = () => {};

const CodeEditorView = lazy(async () => {
    const module = await import('./CodeEditorView.tsx');

    return { default: module.CodeEditorView };
});

/** A code editor for JSON and text that keeps a strict CSP; CodeMirror loads with the first editor shown */
export const CodeEditor: FC<CodeEditorProps> = ({
    label,
    hint,
    value,
    language,
    isReadOnly = false,
    minRows = DEFAULT_ROWS.MIN,
    maxRows = DEFAULT_ROWS.MAX,
    onChange = onTextIgnore,
}) => {
    const { t } = useTranslation();
    const { isJson, isFormattable, onFormat } = useCodeEditor(value, language, onChange);

    const settings = { language, label, isReadOnly, minRows, maxRows };
    const placeholderHeight = `calc(${minRows}lh + 2 * var(--space-s) + 2px)`;
    const hasFormatButton = isJson && !isReadOnly;

    return (
        <div className={styles.editor}>
            <span className={styles.label}>{label}</span>

            <Suspense fallback={<div className={styles.placeholder} style={{ minHeight: placeholderHeight }} />}>
                <CodeEditorView settings={settings} value={value} onChange={onChange} />
            </Suspense>

            {hint && <span className={styles.hint}>{hint}</span>}

            {hasFormatButton && (
                <Button className={styles.format} disabled={!isFormattable} size={ButtonSizes.SMALL} onClick={onFormat}>
                    {t('codeEditorFormat')}
                </Button>
            )}
        </div>
    );
};
