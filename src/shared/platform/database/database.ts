import { formatIssues, validate, type Database, type DatabaseStore } from '#shared/lib';

const CONNECTIONS = new Map<string, Promise<IDBDatabase>>();

const READ_WRITE = 'readwrite';

const NEWEST_FIRST = 'prev';

const getChannelName = (database: Database): string => `${database.name}:changes`;

const getObjectStore = (
    store: DatabaseStore<unknown>,
    connection: IDBDatabase,
    transaction: Nullable<IDBTransaction>,
) => {
    const isStoreContains = connection.objectStoreNames.contains(store.name);

    if (isStoreContains && transaction) {
        return transaction.objectStore(store.name);
    }

    return connection.createObjectStore(store.name, { keyPath: store.keyPath });
};

const getConnectionTransactionStore = <T = unknown>(store: DatabaseStore<T>, connection: IDBDatabase) =>
    connection.transaction(store.name).objectStore(store.name);

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
        const objectStore = getObjectStore(store, connection, transaction);
        const isNewIndex = store.orderBy !== undefined && !objectStore.indexNames.contains(store.orderBy);

        if (isNewIndex) {
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

            connection.addEventListener('versionchange', () => {
                connection.close();
                CONNECTIONS.delete(database.name);
            });

            resolve(connection);
        });
    });

const getConnection = (database: Database): Promise<IDBDatabase> => {
    const cached = CONNECTIONS.get(database.name);

    if (cached !== undefined) {
        return cached;
    }

    const connection = openConnection(database);

    CONNECTIONS.set(database.name, connection);

    connection.catch(() => CONNECTIONS.delete(database.name));

    return connection;
};

const sendChangesNotify = (database: Database, store: DatabaseStore<unknown>): void => {
    const channel = new BroadcastChannel(getChannelName(database));

    // oxlint-disable-next-line unicorn/require-post-message-target-origin -- a BroadcastChannel takes no target origin and reaches only pages of the extension
    channel.postMessage(store.name);
    channel.close();
};

const parseRecord = <T>(store: DatabaseStore<T>, raw: unknown): NotRequired<T> => {
    const result = validate(store.validator, raw);

    if (!result.ok) {
        return;
    }

    return result.value;
};

export const readRecords = async <T>(database: Database, store: DatabaseStore<T>): Promise<T[]> => {
    const connection = await getConnection(database);
    const records: unknown[] = await waitForRequest(getConnectionTransactionStore(store, connection).getAll());

    const parsedRecords: T[] = [];

    for (const record of records) {
        const parsed = parseRecord(store, record);

        if (parsed !== undefined) {
            parsedRecords.push(parsed);
        }
    }

    return parsedRecords;
};

export const readRecord = async <T>(
    database: Database,
    store: DatabaseStore<T>,
    key: string,
): Promise<NotRequired<T>> => {
    const connection = await getConnection(database);
    const record: unknown = await waitForRequest(getConnectionTransactionStore(store, connection).get(key));

    if (record === undefined) {
        return;
    }

    return parseRecord(store, record);
};

/** Refuses to store anything the validator of the store rejects */
export const writeRecord = async <T>(database: Database, store: DatabaseStore<T>, record: T): Promise<void> => {
    const result = validate(store.validator, record);

    if (!result.ok) {
        throw new Error(`Invalid record of ${store.name}: ${formatIssues(result.issues)}`);
    }

    const connection = await getConnection(database);
    const transaction = connection.transaction(store.name, READ_WRITE);

    transaction.objectStore(store.name).put(result.value);

    await waitForTransaction(transaction);

    sendChangesNotify(database, store);
};

export const deleteRecord = async (database: Database, store: DatabaseStore<unknown>, key: string): Promise<void> => {
    const connection = await getConnection(database);
    const transaction = connection.transaction(store.name, READ_WRITE);

    transaction.objectStore(store.name).delete(key);

    await waitForTransaction(transaction);

    sendChangesNotify(database, store);
};

export const clearRecords = async (database: Database, store: DatabaseStore<unknown>): Promise<void> => {
    const connection = await getConnection(database);
    const transaction = connection.transaction(store.name, READ_WRITE);

    transaction.objectStore(store.name).clear();

    await waitForTransaction(transaction);

    sendChangesNotify(database, store);
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

    sendChangesNotify(database, store);
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

/** Calls listener with every valid record of the store now and after each change, until stopped */
export const subscribeRecords = <T>(
    database: Database,
    store: DatabaseStore<T>,
    listener: (records: T[]) => void,
): VoidFunction => {
    let isSubscribed = true;

    const updateRecords = (records: T[]) => {
        if (!isSubscribed) {
            return;
        }

        listener(records);
    };

    const reloadRecords = () => {
        readRecords(database, store)
            .then(updateRecords)
            .catch(() => updateRecords([]));
    };

    const stopWatching = watchRecords(database, store, reloadRecords);

    reloadRecords();

    return () => {
        isSubscribed = false;
        stopWatching();
    };
};
