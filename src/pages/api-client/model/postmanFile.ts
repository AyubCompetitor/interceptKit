import { getObject, getText, type JsonObject } from '../lib/jsonValue.ts';

import type { Environment, EnvVariable } from '#entities/environment';
import type { Collection } from '#entities/request';
import { fail, getRandomUUID, type Result } from '#shared/lib';

import { checkImportedFile, type ImportedFile } from './importedFile.ts';
import { createGapTallies } from './importGaps.ts';
import { buildVariablesName, readImportName, type ImportNames } from './importNames.ts';
import { readPostmanCollection } from './postmanCollection.ts';
import { readPostmanVariables } from './postmanVariables.ts';

const ROOT_PATH = '$';

const SCHEMA_PATH = '$.info.schema';

const POSTMAN_ERRORS = {
    OLD_COLLECTION: 'collections of Postman v1 cannot be imported: export the collection again as v2.1',
    UNKNOWN_VERSION: 'the API client reads collections of the formats v2.0 and v2.1 only',
} as const;

/** https://schema.getpostman.com/json/collection/v2.1.0/collection.json and the like */
const COLLECTION_SCHEMA_RGX = /\/collection\/v2\.[01]\.\d+\//;

/** Postman marks its environment and globals exports with this field */
const SCOPE_FIELD = '_postman_variable_scope';

const ENVIRONMENT_SCOPES: readonly string[] = ['environment', 'globals'];

const getSchema = (file: JsonObject): NotRequired<string> => getText(getObject(file.info)?.schema);

/** Collections of v1 list their requests flat, without info */
const isOldCollection = (file: JsonObject): boolean => Array.isArray(file.requests);

const isEnvironmentFile = (file: JsonObject): boolean => {
    const scope = getText(file[SCOPE_FIELD]) ?? '';
    const isNamedList = Array.isArray(file.values) && getText(file.name) !== undefined;

    return ENVIRONMENT_SCOPES.includes(scope) || isNamedList;
};

export const isPostmanFile = (file: JsonObject): boolean =>
    getSchema(file) !== undefined || isOldCollection(file) || isEnvironmentFile(file);

const buildVariablesEnvironment = (
    collection: Collection,
    variables: readonly EnvVariable[],
    names: ImportNames,
): NotRequired<Environment> => {
    if (!variables.length) {
        return;
    }

    return {
        id: getRandomUUID(),
        name: buildVariablesName(collection.name, names),
        variables,
    };
};

const readCollectionFile = (file: JsonObject, schema: string, names: ImportNames): Result<ImportedFile> => {
    if (!COLLECTION_SCHEMA_RGX.test(schema)) {
        return fail(SCHEMA_PATH, POSTMAN_ERRORS.UNKNOWN_VERSION);
    }

    const gaps = createGapTallies();
    const { collection, variables } = readPostmanCollection(file, names.unnamed, gaps);
    const environment = buildVariablesEnvironment(collection, variables, names);

    return checkImportedFile({ collection, ...(environment && { environment }) }, gaps);
};

const readEnvironmentFile = (file: JsonObject, names: ImportNames): Result<ImportedFile> => {
    const gaps = createGapTallies();

    const environment: Environment = {
        id: getRandomUUID(),
        name: readImportName(file.name, names.unnamed),
        variables: readPostmanVariables(file.values, gaps),
    };

    return checkImportedFile({ environment }, gaps);
};

/** A collection of the formats v2.0 and v2.1, or an environment, exported from Postman */
export const readPostmanFile = (file: JsonObject, names: ImportNames): Result<ImportedFile> => {
    const schema = getSchema(file);

    if (schema !== undefined) {
        return readCollectionFile(file, schema, names);
    }

    if (isOldCollection(file)) {
        return fail(ROOT_PATH, POSTMAN_ERRORS.OLD_COLLECTION);
    }

    return readEnvironmentFile(file, names);
};
