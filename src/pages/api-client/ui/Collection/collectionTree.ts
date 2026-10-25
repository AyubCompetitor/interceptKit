import { isFolderItem, type ApiRequest, type Collection, type CollectionItem } from '#entities/request';
import type { TFunction } from '#shared/i18n';

import { formatRequestUrl } from '../Tabs/requestTabTitle.ts';

/** What a row of the tree shows */
export interface TreeNode {
    /** Id the row opens and closes by */
    readonly nodeId: string;
    /** Id of the folder or the request; none for the collection itself */
    readonly itemId?: string;
    /** Name shown in the row */
    readonly name: string;
    /** The request of a request row */
    readonly request?: ApiRequest;
    /** Whether the row is a folder */
    readonly isFolder: boolean;
    /** What a collection or a folder holds */
    readonly children: readonly CollectionItem[];
}

const getRequestName = (request: ApiRequest, t: TFunction): string =>
    request.name ?? formatRequestUrl(request.url) ?? t('apiClientCollectionNewRequest');

export const getTreeNode = (collection: Collection, item: NotRequired<CollectionItem>, t: TFunction): TreeNode => {
    if (!item) {
        return {
            nodeId: collection.id,
            name: collection.name,
            isFolder: false,
            children: collection.items,
        };
    }

    if (isFolderItem(item)) {
        return {
            nodeId: item.id,
            itemId: item.id,
            name: item.name,
            isFolder: true,
            children: item.items,
        };
    }

    return {
        nodeId: item.request.id,
        itemId: item.request.id,
        name: getRequestName(item.request, t),
        request: item.request,
        isFolder: false,
        children: [],
    };
};
