import { getObject, getObjects, getText, type JsonObject } from '../lib/jsonValue.ts';

import type { EnvVariable } from '#entities/environment';
import {
    CollectionItemTypes,
    createRequestItem,
    MAX_FOLDER_DEPTH,
    type Collection,
    type CollectionItem,
} from '#entities/request';
import { getRandomUUID } from '#shared/lib';

import { addImportGap, ImportGapTypes, type ImportGapTallies } from './importGaps.ts';
import { readImportName } from './importNames.ts';
import { readAuth, readPostmanRequest, type PostmanContext } from './postmanRequest.ts';
import { readPostmanVariables } from './postmanVariables.ts';

export interface PostmanCollectionImport {
    /** The collection with new ids; it gets its time of creation when it is stored */
    readonly collection: Collection;
    /** Variables of the collection, for an environment of their own */
    readonly variables: readonly EnvVariable[];
}

const getScriptText = (event: JsonObject): string => {
    const exec = getObject(event.script)?.exec;

    if (Array.isArray(exec)) {
        return exec.join('');
    }

    return getText(exec) ?? '';
};

/** Pre-request scripts and tests are code: they are counted, never carried over */
const countScripts = (events: unknown, gaps: ImportGapTallies) => {
    const scripts = getObjects(events).filter(event => getScriptText(event).trim() !== '');

    if (!scripts.length) {
        return;
    }

    addImportGap(gaps, ImportGapTypes.SCRIPTS, [], scripts.length);
};

const countExamples = (item: JsonObject, gaps: ImportGapTallies) => {
    const examples = getObjects(item.response);

    if (!examples.length) {
        return;
    }

    addImportGap(gaps, ImportGapTypes.EXAMPLES, [], examples.length);
};

const readRequestItem = (item: JsonObject, context: PostmanContext): NotRequired<CollectionItem> => {
    const request = readPostmanRequest(item, context);

    countExamples(item, context.gaps);

    if (!request) {
        return;
    }

    return createRequestItem(request);
};

const readItems = (items: unknown, context: PostmanContext, depth: number): CollectionItem[] => {
    const collectionItems: CollectionItem[] = [];

    for (const item of getObjects(items)) {
        countScripts(item.event, context.gaps);

        if (Array.isArray(item.item)) {
            collectionItems.push(...readFolder(item, context, depth));

            continue;
        }

        const requestItem = readRequestItem(item, context);

        if (requestItem) {
            collectionItems.push(requestItem);
        }
    }

    return collectionItems;
};

const readFolder = (folder: JsonObject, context: PostmanContext, depth: number): CollectionItem[] => {
    const folderContext: PostmanContext = {
        ...context,
        auth: readAuth(folder.auth) ?? context.auth,
    };

    const items = readItems(folder.item, folderContext, depth + 1);

    if (depth > MAX_FOLDER_DEPTH) {
        addImportGap(context.gaps, ImportGapTypes.DEEP_FOLDERS);

        return items;
    }

    return [
        {
            itemType: CollectionItemTypes.FOLDER,
            id: getRandomUUID(),
            name: readImportName(folder.name, context.unnamed),
            items,
        },
    ];
};

export const readPostmanCollection = (
    file: JsonObject,
    unnamed: string,
    gaps: ImportGapTallies,
): PostmanCollectionImport => {
    const context: PostmanContext = {
        auth: readAuth(file.auth),
        gaps,
        unnamed,
    };

    countScripts(file.event, gaps);

    return {
        collection: {
            id: getRandomUUID(),
            name: readImportName(getObject(file.info)?.name, unnamed),
            createdAt: 0,
            items: readItems(file.item, context, 1),
        },
        variables: readPostmanVariables(file.variable, gaps),
    };
};
