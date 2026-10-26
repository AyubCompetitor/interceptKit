import type { FC } from 'react';

import type { CollectionTreeActions } from '../../model/useCollectionPanel.ts';

import { getItemId, MAX_FOLDER_DEPTH, type Collection, type CollectionItem } from '#entities/request';
import { useTranslation } from '#shared/i18n';
import { Icon, IconNames, joinClassNames, Menu, MethodLabel, type MenuAction } from '#shared/ui';

import { getTreeNode } from './collectionTree.ts';
import styles from './CollectionTreeNode.module.css';

interface CollectionTreeNodeProps {
    /** The collection the node belongs to */
    collection: Collection;
    /** A folder or a request of the collection; none for the collection itself */
    item?: CollectionItem;
    /** 0 for the collection, 1 for its top items */
    depth: number;
    /** Collections and folders the user closed */
    collapsedIds: readonly string[];
    /** What the rows can start */
    actions: CollectionTreeActions;
}

/** A collection, a folder or a request, and below an open collection or folder everything inside it */
export const CollectionTreeNode: FC<CollectionTreeNodeProps> = ({ collection, item, depth, collapsedIds, actions }) => {
    const { t } = useTranslation();

    const node = getTreeNode(collection, item, t);
    const { request } = node;
    const isOpen = !collapsedIds.includes(node.nodeId);

    const onToggle = () => actions.onItemToggle(node.nodeId);
    const onRequestAdd = () => actions.onRequestAddOpen(collection, node.itemId);
    const onFolderAdd = () => actions.onFolderAddOpen(collection, node.itemId);
    const onRename = () => actions.onRenameOpen(collection, node.name, node.itemId);
    const onDelete = () => actions.onDeleteOpen(collection, node.name, node.itemId);

    const editActions: MenuAction[] = [
        { label: t('apiClientCollectionRename'), onSelect: onRename },
        { label: t('apiClientCollectionDelete'), onSelect: onDelete },
    ];

    const addActions: MenuAction[] = [
        { label: t('apiClientCollectionNewRequest'), onSelect: onRequestAdd },
        ...(depth < MAX_FOLDER_DEPTH ? [{ label: t('apiClientCollectionNewFolder'), onSelect: onFolderAdd }] : []),
    ];

    return (
        <li>
            <div className={styles.row}>
                {request && (
                    <button
                        className={styles.open}
                        type='button'
                        onClick={() => actions.onRequestOpen(collection, request)}
                    >
                        <Icon className={styles.placeholder} name={IconNames.CHEVRON} />
                        <MethodLabel method={request.method} />
                        <span className={styles.name}>{node.name}</span>
                    </button>
                )}

                {!request && (
                    <button aria-expanded={isOpen} className={styles.open} type='button' onClick={onToggle}>
                        <Icon
                            className={joinClassNames(styles.chevron, isOpen && styles.isOpen)}
                            name={IconNames.CHEVRON}
                        />
                        {node.isFolder && <Icon name={IconNames.FOLDER} />}
                        <span className={styles.name}>{node.name}</span>
                    </button>
                )}

                <Menu
                    actions={request ? editActions : [...addActions, ...editActions]}
                    label={t('apiClientCollectionMenu', node.name)}
                />
            </div>

            {isOpen && !!node.children.length && (
                <ul className={styles.children}>
                    {node.children.map(child => (
                        <CollectionTreeNode
                            key={getItemId(child)}
                            actions={actions}
                            collapsedIds={collapsedIds}
                            collection={collection}
                            depth={depth + 1}
                            item={child}
                        />
                    ))}
                </ul>
            )}
        </li>
    );
};
