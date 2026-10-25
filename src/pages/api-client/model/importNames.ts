import { MAX_DISPLAY_NAME_LENGTH } from '#shared/lib';

/** Words the import puts into names, in the language of the page */
export interface ImportNames {
    /** Name of a collection, folder, request or environment the file leaves without one */
    readonly unnamed: string;
    /** Ends the name of the environment made of the variables of a collection */
    readonly variablesSuffix: string;
}

/** A name of the file, trimmed to what the API client keeps */
export const readImportName = (value: unknown, unnamed: string): string => {
    const name = typeof value === 'string' ? value.trim() : '';

    if (name === '') {
        return unnamed;
    }

    return name.slice(0, MAX_DISPLAY_NAME_LENGTH);
};

export const buildVariablesName = (collectionName: string, names: ImportNames): string =>
    `${collectionName}${names.variablesSuffix}`.slice(0, MAX_DISPLAY_NAME_LENGTH);
