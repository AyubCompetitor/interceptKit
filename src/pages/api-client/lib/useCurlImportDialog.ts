import { useState } from 'react';

export const useCurlImportDialog = () => {
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const onDialogOpen = () => setIsDialogOpen(true);

    const onDialogClose = () => setIsDialogOpen(false);

    return {
        isDialogOpen,
        onDialogOpen,
        onDialogClose,
    };
};
