import { useId, type ReactNode } from 'react';

import { Button, ButtonSizes, ButtonVariants } from '../Button/index.ts';

import { useTranslation } from '#shared/i18n';

import styles from './Modal.module.css';
import { useModalRef } from './useModalRef.ts';

interface ModalProps {
    /** Shows the dialog as modal while true */
    isOpen: boolean;
    /** Heading and accessible name of the dialog */
    title: string;
    /** Actions under the content, usually buttons */
    footer?: ReactNode;
    /** Called on every close */
    onClose: VoidFunction;
}

export const Modal: FCC<ModalProps> = ({ isOpen, onClose, title, footer, children }) => {
    const titleId = useId();

    const { t } = useTranslation();
    const { modalRef, onModalClose } = useModalRef(isOpen);

    return (
        <dialog aria-labelledby={titleId} className={styles.modal} ref={modalRef} onClose={onClose}>
            <header className={styles.header}>
                <h2 className={styles.title} id={titleId}>
                    {title}
                </h2>

                <Button
                    aria-label={t('dialogClose')}
                    size={ButtonSizes.SMALL}
                    variant={ButtonVariants.GHOST}
                    onClick={onModalClose}
                >
                    <span aria-hidden='true' className={styles.closeIcon}>
                        ×
                    </span>
                </Button>
            </header>
            <div className={styles.body}>{isOpen && children}</div>
            {footer && <footer className={styles.footer}>{footer}</footer>}
        </dialog>
    );
};
