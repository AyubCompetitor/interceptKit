import type { FC } from 'react';

import styles from './CodeEditor.module.css';
import type { CodeEditorViewProps } from './types.ts';
import { useCodeEditorView } from './useCodeEditorView.ts';

export const CodeEditorView: FC<CodeEditorViewProps> = props => {
    const { hostRef } = useCodeEditorView(props);

    return <div className={styles.host} ref={hostRef} />;
};
