import { formatIssues, validate, type Database, type DatabaseStore } from '#shared/lib';

/** One open connection per database for the life of the page */
const connections = new Map<string, Promise<IDBDatabase>>();

const READ_WRITE = 'readwrite';

const NEWEST_FIRST = 'prev';

const getChannelName = (database: Database): string => `${database.name}:changes`;

const waitForRequest = <T>(request: IDBRequest<T>): Promise<T> =>
    new Promise((resolve, reject) => {
        request.addEventListener('success', () => resolve(request.result));
        request.addEventListener('error', () => reject(request.error));
    });

/** Resolves once everything the transaction did is stored */
const waitForTransaction = (transaction: IDBTransaction): Promise<void> =>
    new Promise((resolve, reject) => {
        transaction.addEventListener('complete', () => resolve());
        transaction.addEventListener('error', () => reject(transaction.error));
        transaction.addEventListener('abort', () => reject(transaction.error));
    });

/** Creates the stores and indexes a new version adds; records of existing stores stay */
const upgradeDatabase = (database: Database, request: IDBOpenDBRequest): void => {
    const connection = request.result;
    const transaction = request.transaction;

    for (const store of database.stores) {
        const hasStore = connection.objectStoreNames.contains(store.name);
        const objectStore =
            hasStore && transaction
                ? transaction.objectStore(store.name)
                : connection.createObjectStore(store.name, { keyPath: store.keyPath });

        if (store.orderBy !== undefined && !objectStore.indexNames.contains(store.orderBy)) {
            objectStore.createIndex(store.orderBy, store.orderBy);
        }
    }
};

const openConnection = (database: Database): Promise<IDBDatabase> =>
    new Promise((resolve, reject) => {
        const request = indexedDB.open(database.name, database.version);

        request.addEventListener('upgradeneeded', () => upgradeDatabase(database, request));
        request.addEventListener('error', () => reject(request.error));
        request.addEventListener('success', () => {
            const connection = request.result;

            /** Another page opens a newer version: this one lets it go and reconnects on its next call */
            connection.addEventListener('versionchange', () => {
                connection.close();
                connections.delete(database.name);
            });

            resolve(connection);
        });
    });

const getConnection = (database: Database): Promise<IDBDatabase> => {
    const cached = connections.get(database.name);

    if (cached !== undefined) {
        return cached;
    }

    const connection = openConnection(database);

    connections.set(database.name, connection);
    connection.catch(() => connections.delete(database.name));

    return connection;
};

/** Tells every page of the extension, this one included, that the records of the store changed */
const notifyChange = (database: Database, store: DatabaseStore<unknown>): void => {
    const channel = new BroadcastChannel(getChannelName(database));

    // oxlint-disable-next-line unicorn/require-post-message-target-origin -- a BroadcastChannel takes no target origin and reaches only pages of the extension
    channel.postMessage(store.name);
    channel.close();
};

const parseRecord = <T>(store: DatabaseStore<T>, raw: unknown): NotRequired<T> => {
    const result = validate(store.validator, raw);

    if (result.ok) {
        return result.value;
    }

    console.warn(`[database] a record of ${store.name} is invalid and skipped:`, formatIssues(result.issues));

    return;
};

/** Every valid record of the store, in key order; broken ones are skipped with a warning */
export const readRecords = async <T>(database: Database, store: DatabaseStore<T>): Promise<T[]> => {
    const connection = await getConnection(database);
    const records = await waitForRequest(connection.transaction(store.name).objectStore(store.name).getAll());

    return records.map(record => parseRecord(store, record)).filter(record => record !== undefined);
};

export const readRecord = async <T>(
    database: Database,
    store: DatabaseStore<T>,
    key: string,
): Promise<NotRequired<T>> => {
    const connection = await getConnection(database);
    const record: unknown = await waitForRequest(connection.transaction(store.name).objectStore(store.name).get(key));

    if (record === undefined) {
        return;
    }

    return parseRecord(store, record);
};

/** Refuses to store anything the validator of the store rejects */
export const writeRecord = async <T>(database: Database, store: DatabaseStore<T>, record: T): Promise<void> => {
    const result = validate(store.validator, record);

    if (!result.ok) {
        throw new Error(`Refusing to store an invalid record of ${store.name}: ${formatIssues(result.issues)}`);
    }

    const connection = await getConnection(database);
    const transaction = connection.transaction(store.name, READ_WRITE);

    transaction.objectStore(store.name).put(result.value);

    await waitForTransaction(transaction);

    notifyChange(database, store);
};

export const deleteRecord = async (database: Database, store: DatabaseStore<unknown>, key: string): Promise<void> => {
    const connection = await getConnection(database);
    const transaction = connection.transaction(store.name, READ_WRITE);

    transaction.objectStore(store.name).delete(key);

    await waitForTransaction(transaction);

    notifyChange(database, store);
};

export const clearRecords = async (database: Database, store: DatabaseStore<unknown>): Promise<void> => {
    const connection = await getConnection(database);
    const transaction = connection.transaction(store.name, READ_WRITE);

    transaction.objectStore(store.name).clear();

    await waitForTransaction(transaction);

    notifyChange(database, store);
};

/** Skips the newest records by the order of the store and deletes the rest, in one transaction */
export const trimRecords = async (database: Database, store: DatabaseStore<unknown>, keep: number): Promise<void> => {
    if (store.orderBy === undefined) {
        throw new Error(`The store ${store.name} has no order to trim by`);
    }

    const connection = await getConnection(database);
    const transaction = connection.transaction(store.name, READ_WRITE);
    const request = transaction.objectStore(store.name).index(store.orderBy).openCursor(null, NEWEST_FIRST);

    let isPastKept = keep === 0;

    request.addEventListener('success', () => {
        const cursor = request.result;

        if (!cursor) {
            return;
        }

        if (!isPastKept) {
            isPastKept = true;
            cursor.advance(keep);

            return;
        }

        cursor.delete();
        cursor.continue();
    });

    await waitForTransaction(transaction);

    notifyChange(database, store);
};

/** Calls listener whenever a page of the extension changes the records of the store */
export const watchRecords = (
    database: Database,
    store: DatabaseStore<unknown>,
    listener: VoidFunction,
): VoidFunction => {
    const channel = new BroadcastChannel(getChannelName(database));

    channel.addEventListener('message', (event: MessageEvent<unknown>) => {
        if (event.data === store.name) {
            listener();
        }
    });

    return () => channel.close();
};
