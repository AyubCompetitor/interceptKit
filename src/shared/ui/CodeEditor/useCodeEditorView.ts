import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';

import { Compartment, EditorState } from '@codemirror/state';
import { EditorView, type ViewUpdate } from '@codemirror/view';

import { buildCodeEditorExtensions } from './codeEditorExtensions.ts';
import type { CodeEditorViewProps } from './types.ts';

const SHADOW_MODE = 'open';

/**
 * Runs CodeMirror inside a shadow root of the host
 */
export const useCodeEditorView = ({ value, settings, onChange }: CodeEditorViewProps) => {
    const { language, label, isReadOnly, minRows, maxRows } = settings;
    const [compartment] = useState(() => new Compartment());

    const hostRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<NotRequired<EditorView>>(undefined);

    const extensions = useMemo(
        () => buildCodeEditorExtensions({ language, label, isReadOnly, minRows, maxRows }),
        [language, label, isReadOnly, minRows, maxRows],
    );

    const onEditorUpdate = useEffectEvent((update: ViewUpdate) => {
        if (!update.docChanged) {
            return;
        }

        onChange(update.state.doc.toString());
    });

    const createView = useEffectEvent((root: ShadowRoot) => {
        const state = EditorState.create({
            doc: value,
            extensions: [compartment.of(extensions), EditorView.updateListener.of(onEditorUpdate)],
        });

        return new EditorView({
            root,
            state,
            parent: root,
        });
    });

    useEffect(() => {
        if (!hostRef.current) {
            return;
        }

        const root = hostRef.current.shadowRoot ?? hostRef.current.attachShadow({ mode: SHADOW_MODE });
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

    useEffect(() => {
        if (!viewRef.current) {
            return;
        }

        const isCurrent = viewRef.current.state.doc.toString() === value;

        if (isCurrent) {
            return;
        }

        viewRef.current.dispatch({
            changes: {
                from: 0,
                insert: value,
                to: viewRef.current.state.doc.length,
            },
        });
    }, [value]);

    return {
        hostRef,
    };
};
