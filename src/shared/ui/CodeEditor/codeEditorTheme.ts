import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import type { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { tags } from '@lezer/highlight';

import { TEMPLATE_CLASS } from './codeEditorTemplates.ts';

const highlightStyle = HighlightStyle.define([
    { tag: tags.propertyName, color: 'var(--color-code-key)' },
    { tag: tags.string, color: 'var(--color-code-string)' },
    { tag: tags.number, color: 'var(--color-code-number)' },
    { tag: [tags.bool, tags.null], color: 'var(--color-code-keyword)' },
    { tag: [tags.brace, tags.squareBracket, tags.separator, tags.punctuation], color: 'var(--color-text-subtle)' },
    { tag: tags.invalid, color: 'var(--color-danger-text)' },
]);

const LINT_STYLES = {
    '.cm-lintRange-error, .cm-lintRange-warning, .cm-lintRange-info, .cm-lintRange-hint': {
        backgroundImage: 'none',
        textDecoration: 'underline wavy var(--color-danger)',
        textUnderlineOffset: '3px',
    },
    '.cm-lint-marker': {
        width: '0.6em',
        height: '0.6em',
        margin: '0.45em 0.2em',
        borderRadius: '50%',
    },
    '.cm-lint-marker-error, .cm-lint-marker-warning, .cm-lint-marker-info': {
        content: 'none',
        background: 'var(--color-danger)',
    },
    '.cm-tooltip': {
        border: '1px solid var(--color-border-strong)',
        borderRadius: 'var(--radius-m)',
        background: 'var(--color-surface-raised)',
        color: 'var(--color-text)',
        boxShadow: 'var(--shadow-raised)',
    },
    '.cm-diagnostic': {
        padding: 'var(--space-xs) var(--space-s)',
        borderLeft: 'none',
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--font-size-s)',
    },
};

export const buildCodeEditorTheme = (minRows: number, maxRows: number): Extension => [
    EditorView.theme({
        '&': {
            border: '1px solid var(--color-border-strong)',
            borderRadius: 'var(--radius-m)',
            background: 'var(--color-field)',
            color: 'var(--color-text)',
            fontSize: 'var(--font-size-s)',
            transition: 'border-color 0.15s, box-shadow 0.15s',
        },
        '&:hover': {
            borderColor: 'var(--color-border-hover)',
        },
        '&.cm-focused': {
            outline: 'none',
            borderColor: 'var(--color-focus)',
            boxShadow: '0 0 0 1px var(--color-focus)',
        },
        '.cm-scroller': {
            maxHeight: `${maxRows}lh`,
            overflow: 'auto',
            fontFamily: 'var(--font-mono)',
            lineHeight: 'var(--line-height)',
            borderRadius: 'inherit',
        },
        '.cm-content': {
            minHeight: `${minRows}lh`,
            padding: 'var(--space-s) 0',
            caretColor: 'var(--color-text)',
        },
        '.cm-gutters': {
            border: 'none',
            background: 'transparent',
            color: 'var(--color-text-subtle)',
        },
        '.cm-cursor, .cm-dropCursor': {
            borderLeftColor: 'var(--color-text)',
        },
        '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
            background: 'var(--color-selection)',
        },
        '&.cm-focused .cm-matchingBracket': {
            background: 'var(--color-surface-pressed)',
        },
        [`.${TEMPLATE_CLASS}, .${TEMPLATE_CLASS} *`]: {
            borderRadius: 'var(--radius-s)',
            background: 'var(--color-variable-surface)',
            color: 'var(--color-variable-text)',
        },
        ...LINT_STYLES,
    }),

    syntaxHighlighting(highlightStyle),
];
