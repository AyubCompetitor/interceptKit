import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { json } from '@codemirror/lang-json';
import { bracketMatching, indentOnInput, indentUnit } from '@codemirror/language';
import { linter, lintGutter, lintKeymap } from '@codemirror/lint';
import { EditorState, type Extension } from '@codemirror/state';
import { drawSelection, EditorView, highlightSpecialChars, keymap, lineNumbers } from '@codemirror/view';

import { lintJson } from './codeEditorLint.ts';
import { templateHighlight } from './codeEditorTemplates.ts';
import { buildCodeEditorTheme } from './codeEditorTheme.ts';
import { CodeLanguages, type CodeEditorSettings, type CodeLanguage } from './types.ts';

const LINT_DELAY_MS = 300;

const INDENT = '    ';

const TYPING_INPUT = 'insertText';

const TYPING_EVENT = 'input.type';

const LINE_BREAK = '\n';

const isMultiLineSelection = (view: EditorView): boolean => {
    const { from, to } = view.state.selection.main;

    return view.state.doc.lineAt(from).number !== view.state.doc.lineAt(to).number;
};

const onBeforeInput = (event: InputEvent, view: EditorView): boolean => {
    const text = event.data ?? '';

    const isTyping = event.inputType === TYPING_INPUT && event.data !== null;
    const isMultiLine = isMultiLineSelection(view) || text.includes(LINE_BREAK);

    if (!isTyping || !isMultiLine) {
        return false;
    }

    event.preventDefault();

    const changes = view.state.replaceSelection(text);

    view.dispatch(
        view.state.update(changes, {
            userEvent: TYPING_EVENT,
            scrollIntoView: true,
        }),
    );

    return true;
};

const BASE_EXTENSIONS: Extension = [
    EditorView.domEventHandlers({ beforeinput: onBeforeInput }),
    lineNumbers(),
    highlightSpecialChars(),
    drawSelection(),
    history(),
    indentOnInput(),
    indentUnit.of(INDENT),
    bracketMatching(),
    closeBrackets(),
    keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap, ...lintKeymap, indentWithTab]),
    EditorView.lineWrapping,
];

const LANGUAGE_EXTENSIONS: Record<CodeLanguage, Extension> = {
    [CodeLanguages.JSON]: [json(), linter(lintJson, { delay: LINT_DELAY_MS }), lintGutter()],
    [CodeLanguages.TEXT]: [],
};

export const buildCodeEditorExtensions = (settings: CodeEditorSettings): Extension => [
    BASE_EXTENSIONS,
    LANGUAGE_EXTENSIONS[settings.language],
    EditorState.readOnly.of(settings.isReadOnly),
    EditorView.editable.of(!settings.isReadOnly),
    EditorView.contentAttributes.of({ 'aria-label': settings.label }),
    settings.isWithTemplates ? templateHighlight : [],
    buildCodeEditorTheme(settings.minRows, settings.maxRows),
];
