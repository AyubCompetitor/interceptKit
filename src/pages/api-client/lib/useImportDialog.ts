import { useState } from 'react';

export const useImportDialog = () => {
    const [isImportOpen, setIsImportOpen] = useState(false);

    const onImportOpen = () => setIsImportOpen(true);

    const onImportClose = () => setIsImportOpen(false);

    return {
        isImportOpen,
        onImportOpen,
        onImportClose,
    };
};
