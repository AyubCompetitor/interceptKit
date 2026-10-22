import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';

import { Compartment, EditorState } from '@codemirror/state';
import { EditorView, type ViewUpdate } from '@codemirror/view';

import { buildCodeEditorExtensions } from './codeEditorExtensions.ts';
import type { CodeEditorViewProps } from './types.ts';

const SHADOW_MODE = 'open';

/**
 * Runs CodeMirror inside a shadow root of the host: there its styles go to adoptedStyleSheets
 * instead of a <style> element, which a strict style-src blocks.
 */
export const useCodeEditorView = ({ value, settings, onChange }: CodeEditorViewProps) => {
    const hostRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<NotRequired<EditorView>>(undefined);
    const [compartment] = useState(() => new Compartment());

    const { language, label, isReadOnly, minRows, maxRows } = settings;

    /** A stable list for the effect below: the editor is reconfigured only when a setting changes */
    const extensions = useMemo(
        () => buildCodeEditorExtensions({ language, label, isReadOnly, minRows, maxRows }),
        [language, label, isReadOnly, minRows, maxRows],
    );

    const onEditorUpdate = useEffectEvent((update: ViewUpdate) => {
        if (update.docChanged) {
            onChange(update.state.doc.toString());
        }
    });

    const createView = useEffectEvent((root: ShadowRoot) => {
        const state = EditorState.create({
            doc: value,
            extensions: [compartment.of(extensions), EditorView.updateListener.of(onEditorUpdate)],
        });

        return new EditorView({ state, parent: root, root });
    });

    useEffect(() => {
        const host = hostRef.current;

        if (!host) {
            return;
        }

        /** Strict mode runs the effect twice, and a host takes only one shadow root */
        const root = host.shadowRoot ?? host.attachShadow({ mode: SHADOW_MODE });
        const view = createView(root);

        viewRef.current = view;

        return () => {
            view.destroy();
            viewRef.current = undefined;
        };
    }, []);

    useEffect(() => {
        viewRef.current?.dispatch({ effects: compartment.reconfigure(extensions) });
    }, [compartment, extensions]);

    /** A value set from outside, such as by the format button, replaces the text */
    useEffect(() => {
        const view = viewRef.current;

        if (!view) {
            return;
        }

        const isCurrent = view.state.doc.toString() === value;

        if (isCurrent) {
            return;
        }

        view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
    }, [value]);

    return {
        hostRef,
    };
};
