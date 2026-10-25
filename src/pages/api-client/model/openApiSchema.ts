import { getFirstItem, getObject, getText, type JsonObject } from '../lib/jsonValue.ts';

import { resolveRef, resolveRefs, type OpenApiContext } from './openApiRefs.ts';

/** Where building one example stands */
interface ExampleState {
    /** The description and its gaps */
    readonly context: OpenApiContext;
    /** How deep the schema being built sits */
    readonly depth: number;
    /** References being built above this schema */
    readonly refs: ReadonlySet<string>;
    /** Values the example may still take */
    readonly budget: { left: number };
}

type ExampleBuilder = (schema: JsonObject, state: ExampleState) => unknown;

/** Schemas inside schemas are filled this deep */
const MAX_SCHEMA_DEPTH = 8;

/** A wide description of GitHub or Stripe size gives a short example instead of a page that hangs */
const MAX_EXAMPLE_VALUES = 200;

const NULL_TYPE = 'null';

const OBJECT_TYPE = 'object';

const ARRAY_TYPE = 'array';

/** What a value of a type is before anyone types it */
const EMPTY_VALUES = new Map<string, unknown>([
    ['string', ''],
    ['integer', 0],
    ['number', 0],
    ['boolean', false],
]);

/** What the description itself gives: an example of 3.0, the examples of 3.1, a default, a constant or the first choice */
export const getGivenExample = (schema: NotRequired<JsonObject>): unknown =>
    schema?.example ?? getFirstItem(schema?.examples) ?? schema?.default ?? schema?.const ?? getFirstItem(schema?.enum);

/** 3.1 writes nullable types as ["string", "null"]; a schema without a type says it by its fields */
const getSchemaType = (schema: JsonObject): NotRequired<string> => {
    const types: readonly unknown[] = Array.isArray(schema.type) ? schema.type : [schema.type];
    const type = getText(types.find(candidate => candidate !== NULL_TYPE));

    if (type !== undefined) {
        return type;
    }

    if (getObject(schema.properties)) {
        return OBJECT_TYPE;
    }

    if (schema.items !== undefined) {
        return ARRAY_TYPE;
    }

    return;
};

/** Fields past the budget are left out, so a wide object ends early instead of filling with nulls */
const buildObjectExample: ExampleBuilder = (schema, state) => {
    const example: Record<string, unknown> = {};

    for (const [name, property] of Object.entries(getObject(schema.properties) ?? {})) {
        if (state.budget.left <= 0) {
            break;
        }

        example[name] = buildExample(property, state);
    }

    return example;
};

const buildArrayExample: ExampleBuilder = (schema, state) => [buildExample(schema.items, state)];

const EXAMPLE_BUILDERS = new Map<string, ExampleBuilder>([
    [OBJECT_TYPE, buildObjectExample],
    [ARRAY_TYPE, buildArrayExample],
]);

/** allOf joins the fields of its parts; a part that is not an object adds nothing */
const buildAllOfExample: ExampleBuilder = (schema, state) => {
    const example: Record<string, unknown> = {};

    for (const part of resolveRefs(schema.allOf, state.context)) {
        Object.assign(example, getObject(buildExample(part, state)));
    }

    return example;
};

const buildSchemaShape: ExampleBuilder = (schema, state) => {
    if (Array.isArray(schema.allOf)) {
        return buildAllOfExample(schema, state);
    }

    const variant = getFirstItem(schema.oneOf) ?? getFirstItem(schema.anyOf);

    if (variant !== undefined) {
        return buildExample(variant, state);
    }

    const type = getSchemaType(schema) ?? NULL_TYPE;
    const builder = EXAMPLE_BUILDERS.get(type);

    if (!builder) {
        return EMPTY_VALUES.get(type) ?? null;
    }

    return builder(schema, state);
};

/** Every value, null too, takes one from the budget; a schema that contains itself or sits too deep gives null */
const buildExample = (value: unknown, state: ExampleState): unknown => {
    if (state.budget.left <= 0) {
        return null;
    }

    state.budget.left -= 1;

    const ref = getText(getObject(value)?.$ref);
    const isRepeatedRef = ref !== undefined && state.refs.has(ref);
    const schema = resolveRef(value, state.context);

    if (!schema || isRepeatedRef || state.depth > MAX_SCHEMA_DEPTH) {
        return null;
    }

    const givenExample = getGivenExample(schema);

    if (givenExample !== undefined) {
        return givenExample;
    }

    const innerState: ExampleState = {
        ...state,
        depth: state.depth + 1,
        refs: ref === undefined ? state.refs : new Set([...state.refs, ref]),
    };

    return buildSchemaShape(schema, innerState);
};

/** A value that fits the schema: the example it gives, or empty values in its shape */
export const buildSchemaExample = (value: unknown, context: OpenApiContext): unknown =>
    buildExample(value, {
        context,
        depth: 0,
        refs: new Set(),
        budget: { left: MAX_EXAMPLE_VALUES },
    });
