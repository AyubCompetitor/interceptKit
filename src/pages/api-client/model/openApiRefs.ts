import { getField, getObject, getText, type JsonObject } from '../lib/jsonValue.ts';

import { addImportGap, ImportGapTypes, type ImportGapTallies } from './importGaps.ts';

/** What reading an OpenAPI description needs everywhere */
export interface OpenApiContext {
    /** The whole description, where references point */
    readonly document: JsonObject;
    /** Where the gaps of the file are counted */
    readonly gaps: ImportGapTallies;
    /** Names of the variables that hold tokens, as the requests use them */
    readonly tokenNames: Set<string>;
    /** Whether the description has one security scheme, whose token is then simply {{token}} */
    readonly isSingleScheme: boolean;
    /** Name for an item without one */
    readonly unnamed: string;
}

/** References lead to references at most this many times; a loop of them leads nowhere */
const MAX_REF_HOPS = 20;

const LOCAL_REF_PREFIX = '#/';

const POINTER_MARKS = {
    SEPARATOR: '/',
    SLASH: '~1',
    TILDE: '~0',
} as const;

/** A part of #/components/schemas/Pet, with ~1 for / and ~0 for ~ */
const decodePointerPart = (part: string): string => {
    let decoded = part;

    try {
        decoded = decodeURIComponent(part);
    } catch {}

    return decoded.replaceAll(POINTER_MARKS.SLASH, '/').replaceAll(POINTER_MARKS.TILDE, '~');
};

const getChild = (value: unknown, key: string): unknown => {
    if (Array.isArray(value)) {
        return value[Number(key)];
    }

    return getField(getObject(value), key);
};

const findPointer = (document: JsonObject, pointer: string): unknown => {
    let target: unknown = document;

    for (const part of pointer.slice(LOCAL_REF_PREFIX.length).split(POINTER_MARKS.SEPARATOR)) {
        target = getChild(target, decodePointerPart(part));
    }

    return target;
};

/** Only references inside the description are followed; one to another file counts as a gap */
const followRef = (value: unknown, context: OpenApiContext): NotRequired<JsonObject> => {
    const ref = getText(value);

    if (ref === undefined) {
        return;
    }

    if (!ref.startsWith(LOCAL_REF_PREFIX)) {
        addImportGap(context.gaps, ImportGapTypes.EXTERNAL_REFS, [ref]);

        return;
    }

    return getObject(findPointer(context.document, ref));
};

/** The object itself, or the one its $ref points to */
export const resolveRef = (value: unknown, context: OpenApiContext): NotRequired<JsonObject> => {
    let resolved = getObject(value);
    let hops = 0;

    while (resolved?.$ref !== undefined && hops < MAX_REF_HOPS) {
        resolved = followRef(resolved.$ref, context);
        hops += 1;
    }

    if (resolved?.$ref !== undefined) {
        return;
    }

    return resolved;
};

/** The objects of a list, each with its $ref followed */
export const resolveRefs = (value: unknown, context: OpenApiContext): JsonObject[] => {
    const objects: JsonObject[] = [];
    const items: readonly unknown[] = Array.isArray(value) ? value : [];

    for (const item of items) {
        const resolved = resolveRef(item, context);

        if (resolved) {
            objects.push(resolved);
        }
    }

    return objects;
};
