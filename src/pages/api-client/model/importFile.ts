import { getObject, getText, type JsonObject } from '../lib/jsonValue.ts';

import { fail, ok, type Result } from '#shared/lib';

import type { ImportedFile } from './importedFile.ts';
import type { ImportNames } from './importNames.ts';
import { readOpenApiFile } from './openApiFile.ts';
import { isPostmanFile, readPostmanFile } from './postmanFile.ts';

export const MAX_IMPORT_LENGTH = 10_000_000;

const ROOT_PATH = '$';

const IMPORT_ERRORS = {
    TOO_LARGE: 'the file is larger than 10 MB',
    NOT_JSON: 'the text is not JSON',
    YAML: 'the text looks like YAML, which the API client does not read yet: convert the file to JSON',
    SWAGGER: 'Swagger 2.0 cannot be imported: convert the file to OpenAPI 3',
    UNKNOWN_FORMAT: 'the file is neither a Postman collection or environment nor an OpenAPI description',
    TOO_DEEP: 'the file is nested too deep to read',
} as const;

/** A line such as openapi: 3.1.0 at the start of a YAML document */
const YAML_HEAD_RGX = /^\s*(openapi|swagger)\s*:/m;

const parseJson = (text: string): Result<unknown> => {
    try {
        return ok(JSON.parse(text));
    } catch {
        if (!YAML_HEAD_RGX.test(text)) {
            return fail(ROOT_PATH, IMPORT_ERRORS.NOT_JSON);
        }

        return fail(ROOT_PATH, IMPORT_ERRORS.YAML);
    }
};

const readFile = (file: JsonObject, names: ImportNames): Result<ImportedFile> => {
    if (getText(file.openapi) !== undefined) {
        return readOpenApiFile(file, names);
    }

    if (file.swagger !== undefined) {
        return fail(ROOT_PATH, IMPORT_ERRORS.SWAGGER);
    }

    if (isPostmanFile(file)) {
        return readPostmanFile(file, names);
    }

    return fail(ROOT_PATH, IMPORT_ERRORS.UNKNOWN_FORMAT);
};

/** A Postman collection or environment, or an OpenAPI description, as JSON */
export const parseImportFile = (text: string, names: ImportNames): Result<ImportedFile> => {
    if (text.length > MAX_IMPORT_LENGTH) {
        return fail(ROOT_PATH, IMPORT_ERRORS.TOO_LARGE);
    }

    const parsed = parseJson(text);

    if (!parsed.ok) {
        return parsed;
    }

    const file = getObject(parsed.value);

    if (!file) {
        return fail(ROOT_PATH, IMPORT_ERRORS.UNKNOWN_FORMAT);
    }

    try {
        return readFile(file, names);
    } catch (error) {
        /** Folders inside folders, or schemas inside schemas, without end run out of the stack */
        if (!(error instanceof RangeError)) {
            throw error;
        }

        return fail(ROOT_PATH, IMPORT_ERRORS.TOO_DEEP);
    }
};
