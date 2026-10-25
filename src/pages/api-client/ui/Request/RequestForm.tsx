import type { FC, SubmitEvent } from 'react';

import { useCurlExportDialog } from '../../lib/useCurlExportDialog.ts';
import { buildApiRequest, type RequestDraftFields } from '../../model/requestDraft.ts';

import { CurlExportModal } from '../Curl/CurlExportModal.tsx';
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
    /** Saves the request to its collection, or asks where to save it */
    onSave: VoidFunction;
}

/** The export dialog stays outside the form, so its buttons never submit the request */
export const RequestForm: FC<RequestFormProps> = ({ draft, isSending, onDraftChange, onSend, onCancel, onSave }) => {
    const { exportedRequest, onExportOpen, onExportClose } = useCurlExportDialog();

    const onFormSubmit = (event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();
        onSend();
    };

    const onCurlExport = () => onExportOpen(buildApiRequest(draft));

    return (
        <>
            <form className={styles.form} onSubmit={onFormSubmit}>
                <RequestLine
                    draft={draft}
                    isSending={isSending}
                    onCancel={onCancel}
                    onCurlExport={onCurlExport}
                    onDraftChange={onDraftChange}
                    onSave={onSave}
                />

                <RequestEditor draft={draft} onDraftChange={onDraftChange} />
            </form>

            {exportedRequest && <CurlExportModal request={exportedRequest} onClose={onExportClose} />}
        </>
    );
};
