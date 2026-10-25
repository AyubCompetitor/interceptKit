import type { FC } from 'react';

import { CollectionDialogTypes } from '../../lib/useCollectionDialog.ts';
import { useImportDialog } from '../../lib/useImportDialog.ts';
import { useCollectionPanel } from '../../model/useCollectionPanel.ts';

import { MAX_COLLECTIONS, type ApiRequest, type CollectionLink } from '#entities/request';
import { useTranslation } from '#shared/i18n';
import {
    Button,
    ButtonSizes,
    Flex,
    Icon,
    IconNames,
    Spaces,
    Typography,
    TypographyColors,
    TypographySizes,
} from '#shared/ui';

import { CollectionNameModal } from './CollectionNameModal.tsx';
import styles from './CollectionPanel.module.css';
import { CollectionTreeNode } from './CollectionTreeNode.tsx';
import { DeleteCollectionItemModal } from './DeleteCollectionItemModal.tsx';
import { FileImportModal } from '../Import/FileImportModal.tsx';

interface CollectionPanelProps {
    /** Opens a request of a collection in a tab, or shows its tab */
    onRequestOpen: (link: CollectionLink, request: ApiRequest) => void;
}

/** The collections of the API client; the switch of the sidebar names the panel */
export const CollectionPanel: FC<CollectionPanelProps> = ({ onRequestOpen }) => {
    const { t } = useTranslation();
    const {
        collections,
        collapsedIds,
        dialog,
        treeActions,
        isLoading,
        isLimitReached,
        isActionFailed,
        onCreateOpen,
        onNameSubmit,
        onDeleteConfirm,
        onDialogClose,
    } = useCollectionPanel(onRequestOpen);
    const { isImportOpen, onImportOpen, onImportClose } = useImportDialog();

    if (isLoading) {
        return null;
    }

    const isDeleteDialog = dialog?.dialogType === CollectionDialogTypes.DELETE;

    return (
        <section aria-label={t('apiClientCollections')} className={styles.panel}>
            {!!collections.length && (
                <ul className={styles.tree}>
                    {collections.map(collection => (
                        <CollectionTreeNode
                            key={collection.id}
                            actions={treeActions}
                            collapsedIds={collapsedIds}
                            collection={collection}
                            depth={0}
                        />
                    ))}
                </ul>
            )}

            {!collections.length && (
                <Typography color={TypographyColors.HINT} size={TypographySizes.SMALL}>
                    {t('apiClientCollectionsEmpty')}
                </Typography>
            )}

            <Flex gap={Spaces.S} isWrapped>
                <Button disabled={isLimitReached} size={ButtonSizes.SMALL} onClick={onCreateOpen}>
                    <Icon name={IconNames.PLUS} />
                    {t('apiClientCollectionAdd')}
                </Button>

                <Button size={ButtonSizes.SMALL} onClick={onImportOpen}>
                    <Icon name={IconNames.TRANSFER} />
                    {t('apiClientImportOpen')}
                </Button>
            </Flex>

            {isLimitReached && (
                <Typography color={TypographyColors.HINT} size={TypographySizes.SMALL}>
                    {t('apiClientCollectionsLimit', String(MAX_COLLECTIONS))}
                </Typography>
            )}

            {isActionFailed && (
                <Typography color={TypographyColors.DANGER} role='alert'>
                    {t('apiClientCollectionsFailed')}
                </Typography>
            )}

            {dialog && !isDeleteDialog && (
                <CollectionNameModal dialog={dialog} onClose={onDialogClose} onSubmit={onNameSubmit} />
            )}

            {isImportOpen && <FileImportModal onClose={onImportClose} />}

            <DeleteCollectionItemModal
                name={isDeleteDialog ? dialog.name : undefined}
                onCancel={onDialogClose}
                onConfirm={onDeleteConfirm}
            />
        </section>
    );
};
