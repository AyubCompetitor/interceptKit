import type { FC } from 'react';

import { useRequestFormSubmit } from '../../lib/useRequestFormSubmit.ts';
import type { RequestDraftFields } from '../../model/requestDraft.ts';

import { RequestEditor } from './RequestEditor.tsx';
import styles from './RequestForm.module.css';
import { RequestLine } from './RequestLine.tsx';

interface RequestFormProps extends RequestDraftFields {
    /** Whether the request is on the way */
    isSending: boolean;
    /** Sends the request */
    onSend: VoidFunction;
    /** Stops the request on the way */
    onCancel: VoidFunction;
}

export const RequestForm: FC<RequestFormProps> = ({ draft, isSending, onDraftChange, onSend, onCancel }) => {
    const { onFormSubmit } = useRequestFormSubmit(onSend);

    return (
        <form className={styles.form} onSubmit={onFormSubmit}>
            <RequestLine draft={draft} isSending={isSending} onCancel={onCancel} onDraftChange={onDraftChange} />

            <RequestEditor draft={draft} onDraftChange={onDraftChange} />
        </form>
    );
};
