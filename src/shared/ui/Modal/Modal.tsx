import { useId, type ReactNode } from 'react';

import { Button, ButtonSizes, ButtonVariants } from '../Button/index.ts';
import { Icon, IconNames } from '../Icon/index.ts';
import { joinClassNames } from '../joinClassNames.ts';

import { useTranslation } from '#shared/i18n';

import styles from './Modal.module.css';
import { ModalSizes, type ModalSize } from './types.ts';
import { useModalRef } from './useModalRef.ts';

interface ModalProps {
    /** Shows the dialog as modal while true */
    isOpen: boolean;
    /** Heading and accessible name of the dialog */
    title: string;
    /** Width of the dialog */
    size?: ModalSize;
    /** Actions under the content, usually buttons */
    footer?: ReactNode;
    /** Called on every close */
    onClose: VoidFunction;
}

const SIZE_CLASSES: Record<ModalSize, NotRequired<string>> = {
    [ModalSizes.MEDIUM]: styles.medium,
    [ModalSizes.LARGE]: styles.large,
};

export const Modal: FCC<ModalProps> = ({ isOpen, onClose, title, size = ModalSizes.MEDIUM, footer, children }) => {
    const titleId = useId();

    const { t } = useTranslation();
    const { modalRef, onModalClose } = useModalRef(isOpen);

    return (
        <dialog
            aria-labelledby={titleId}
            className={joinClassNames(styles.modal, SIZE_CLASSES[size])}
            ref={modalRef}
            onClose={onClose}
        >
            <header className={styles.header}>
                <h2 className={styles.title} id={titleId}>
                    {title}
                </h2>

                <Button
                    aria-label={t('dialogClose')}
                    size={ButtonSizes.SMALL}
                    variant={ButtonVariants.GHOST}
                    isIconOnly
                    onClick={onModalClose}
                >
                    <Icon name={IconNames.CLOSE} />
                </Button>
            </header>
            <div className={styles.body}>{isOpen && children}</div>
            {footer && <footer className={styles.footer}>{footer}</footer>}
        </dialog>
    );
};
