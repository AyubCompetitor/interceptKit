import { useEffect, useRef } from 'react';

export const useModalRef = (isOpen: boolean) => {
    const modalRef = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const modal = modalRef.current;

        if (!modal) {
            return;
        }

        if (isOpen && !modal.open) {
            modal.showModal();
        }

        if (!isOpen && modal.open) {
            modal.close();
        }
    }, [isOpen]);

    const onModalClose = () => modalRef.current?.close();

    return {
        modalRef,
        onModalClose,
    };
};
