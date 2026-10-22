import { jsonParseLinter } from '@codemirror/lang-json';
import { ensureSyntaxTree } from '@codemirror/language';
import type { Diagnostic } from '@codemirror/lint';
import type { EditorState } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';

/** How long the linter may parse a large body to find the error */
const PARSE_TIMEOUT_MS = 100;

const parseJsonDiagnostics = jsonParseLinter();

/** Where the JSON grammar first fails; JSON.parse names no position for some errors, such as a trailing comma */
export const findJsonErrorPosition = (state: EditorState): NotRequired<number> => {
    const tree = ensureSyntaxTree(state, state.doc.length, PARSE_TIMEOUT_MS);
    let position: NotRequired<number>;

    tree?.iterate({
        enter: node => {
            if (position !== undefined) {
                return false;
            }

            if (node.type.isError) {
                position = node.from;

                return false;
            }

            return;
        },
    });

    return position;
};

const placeDiagnostic = (diagnostic: Diagnostic, position: number, length: number): Diagnostic => ({
    ...diagnostic,
    from: position,
    to: Math.min(position + 1, length),
});

/** An empty body is valid: statuses such as 204 have none */
export const lintJson = (view: EditorView): Diagnostic[] => {
    const { state } = view;
    const isEmpty = state.doc.length === 0;

    if (isEmpty) {
        return [];
    }

    const diagnostics = parseJsonDiagnostics(view);
    const position = findJsonErrorPosition(state);

    if (diagnostics.length === 0 || position === undefined) {
        return diagnostics;
    }

    return diagnostics.map(diagnostic => placeDiagnostic(diagnostic, position, state.doc.length));
};
