import type { Validator } from './validation.ts';

/** An object store of an IndexedDB database and the shape of its records */
export interface DatabaseStore<T> {
    /** Name of the store */
    readonly name: string;
    /** Field of a record that is its key */
    readonly keyPath: string;
    /** Field the store keeps an index on, to trim its oldest records; none for a store read by key */
    readonly orderBy?: string;
    /** Checks records after reading and before writing */
    readonly validator: Validator<T>;
    /** Rewrites a record that an older version kept, once, when the database opens at the new version */
    upgrade?(record: T, oldVersion: number): T;
}

/** An IndexedDB database of the extension; a new version creates the stores and indexes it lacks */
export interface Database {
    /** Name of the database */
    readonly name: string;
    /** Version; raise it when a store or an index is added, or when records change their meaning */
    readonly version: number;
    /** Every store of the database */
    readonly stores: readonly DatabaseStore<unknown>[];
}

export const defineDatabaseStore = <T>(store: DatabaseStore<T>): DatabaseStore<T> => Object.freeze(store);

export const defineDatabase = (database: Database): Database => Object.freeze(database);
