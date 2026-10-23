import { useState } from 'react';

/** The confirmation before the whole history goes */
export const useHistoryClearing = (onHistoryClear: VoidFunction) => {
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    const onClearRequest = () => {
        setIsConfirmOpen(true);
    };

    const onClearCancel = () => {
        setIsConfirmOpen(false);
    };

    const onClearConfirm = () => {
        onHistoryClear();
        setIsConfirmOpen(false);
    };

    return {
        isConfirmOpen,
        onClearRequest,
        onClearCancel,
        onClearConfirm,
    };
};
