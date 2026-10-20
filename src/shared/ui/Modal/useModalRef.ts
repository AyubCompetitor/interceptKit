import { useEffect, useRef } from 'react';

export const useModalRef = (isOpen: boolean) => {
    const modalRef = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const dialog = modalRef.current;

        if (!dialog) {
            return;
        }

        if (isOpen && !dialog.open) {
            dialog.showModal();
        }

        if (!isOpen && dialog.open) {
            dialog.close();
        }
    }, [isOpen]);

    const onModalClose = () => modalRef.current?.close();

    return {
        modalRef,

        onModalClose,
    };
};
