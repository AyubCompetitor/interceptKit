import type { FC, SubmitEvent } from 'react';

import { useCurlExportDialog } from '../../lib/useCurlExportDialog.ts';
import type { TabLocation } from '../../model/collectionTabs.ts';
import { buildApiRequest, type RequestDraftFields } from '../../model/requestDraft.ts';

import { CurlExportModal } from '../Curl/CurlExportModal.tsx';
import { RequestEditor } from './RequestEditor.tsx';
import styles from './RequestForm.module.css';
import { RequestLine } from './RequestLine.tsx';
import { RequestToolbar } from './RequestToolbar.tsx';

interface RequestFormProps extends RequestDraftFields {
    /** Whether the request is on the way */
    isSending: boolean;
    /** Where the request is kept */
    location: NotRequired<TabLocation>;
    /** Sends the request */
    onSend: VoidFunction;
    /** Stops the request on the way */
    onCancel: VoidFunction;
    /** Saves the request to its collection, or asks where to save it */
    onSave: VoidFunction;
}

/** The export dialog stays outside the form, so its buttons never submit the request */
export const RequestForm: FC<RequestFormProps> = ({
    draft,
    isSending,
    location,
    onDraftChange,
    onSend,
    onCancel,
    onSave,
}) => {
    const { exportedRequest, onExportOpen, onExportClose } = useCurlExportDialog();

    const onFormSubmit = (event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();
        onSend();
    };

    const onCurlExport = () => onExportOpen(buildApiRequest(draft));

    return (
        <>
            <div className={styles.request}>
                <RequestToolbar location={location} onCurlExport={onCurlExport} onSave={onSave} />

                <form className={styles.form} onSubmit={onFormSubmit}>
                    <RequestLine
                        draft={draft}
                        isSending={isSending}
                        onCancel={onCancel}
                        onDraftChange={onDraftChange}
                    />

                    <RequestEditor draft={draft} onDraftChange={onDraftChange} />
                </form>
            </div>

            {exportedRequest && <CurlExportModal request={exportedRequest} onClose={onExportClose} />}
        </>
    );
};
