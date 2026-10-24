import { useState, type ChangeEvent } from 'react';

import {
    previewBundleImport,
    transferRpc,
    type BundleContent,
    type BundleCounts,
    type BundleImportResult,
} from '#features/transfer';
import { getErrorText } from '#shared/lib';
import { executeRpc } from '#shared/messaging';

export const useBundleImport = (content: BundleContent) => {
    const [text, setText] = useState('');
    const [importedCounts, setImportedCounts] = useState<NotRequired<BundleCounts>>();
    const [importError, setImportError] = useState<NotRequired<string>>();
    const [isFileUnreadable, setIsFileUnreadable] = useState(false);

    const isTextEmpty = text.trim() === '';
    const preview = isTextEmpty ? undefined : previewBundleImport(text, content);

    const applyText = (nextText: string) => {
        setText(nextText);
        setImportedCounts(undefined);
        setImportError(undefined);
        setIsFileUnreadable(false);
    };

    const applyResult = (result: BundleImportResult) => {
        setText('');
        setImportedCounts(result.counts);
    };

    const onTextChange = (event: ChangeEvent<HTMLTextAreaElement>) => applyText(event.target.value);

    const onFileChoose = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        file.text()
            .then(applyText)
            .catch(() => setIsFileUnreadable(true));
    };

    const onImportConfirm = () => {
        executeRpc(transferRpc.import, { text })
            .then(applyResult)
            .catch((error: unknown) => setImportError(getErrorText(error)));
    };

    return {
        text,
        preview,
        importedCounts,
        importError,
        isFileUnreadable,
        onTextChange,
        onFileChoose,
        onImportConfirm,
    };
};
