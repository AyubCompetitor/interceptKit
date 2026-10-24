import { formatIssues, validate, type Store, type StoreItem, type StoredData } from '#shared/lib';

const getStore = (name: Store): chrome.storage.StorageArea => chrome.storage[name];

const parseStored = <T>(item: StoreItem<T>, raw: unknown): T => {
    if (raw === undefined) {
        return item.fallback;
    }

    const result = validate(item.validator, raw);

    if (!result.ok) {
        return item.fallback;
    }

    return result.value;
};

export const readItem = async <T>(item: StoreItem<T>): Promise<T> => {
    const stored = await getStore(item.area).get(item.key);

    return parseStored(item, stored[item.key]);
};

/** A checked value of one item, ready for writeItems */
export interface ItemWrite {
    /** Area that holds the key */
    readonly area: Store;
    /** Key inside the area */
    readonly key: string;
    /** Value the validator accepted */
    readonly value: unknown;
}

const WRITE_ERRORS = {
    MIXED_AREAS: 'items written together must share one area',
} as const;

/** Refuses anything the items validator rejects */
export const prepareWrite = <T>(item: StoreItem<T>, value: T): ItemWrite => {
    const result = validate(item.validator, value);

    if (!result.ok) {
        const errorMessage = `Refusing to store invalid ${item.key}: ${formatIssues(result.issues)}`;

        throw new Error(errorMessage);
    }

    return {
        area: item.area,
        key: item.key,
        value: result.value,
    };
};

/** One set() call for items that must change together; the browser writes it as one database batch */
export const writeItems = async (writes: readonly ItemWrite[]): Promise<void> => {
    const [firstWrite] = writes;

    if (!firstWrite) {
        return;
    }

    const isOneArea = writes.every(write => write.area === firstWrite.area);

    if (!isOneArea) {
        throw new Error(WRITE_ERRORS.MIXED_AREAS);
    }

    await getStore(firstWrite.area).set(Object.fromEntries(writes.map(write => [write.key, write.value])));
};

/** Refuses to persist anything the items validator rejects */
export const writeItem = async <T>(item: StoreItem<T>, value: T): Promise<void> => {
    await writeItems([prepareWrite(item, value)]);
};

/** Calls listener with the validated new value whenever the item changes in any context */
export const watchItem = <T>(item: StoreItem<T>, listener: (value: T) => void): VoidFunction => {
    const onChanged = (changes: Record<string, chrome.storage.StorageChange>, areaName: string): void => {
        if (areaName !== item.area) {
            return;
        }

        const change = changes[item.key];

        if (change !== undefined) {
            listener(parseStored(item, change.newValue));
        }
    };

    chrome.storage.onChanged.addListener(onChanged);

    return () => chrome.storage.onChanged.removeListener(onChanged);
};

/** Calls listener with the value of the item now and after each change, until stopped */
export const subscribeItem = <T>(item: StoreItem<T>, listener: (value: T) => void): VoidFunction => {
    let isSubscribed = true;

    const updateValue = (value: T) => {
        if (!isSubscribed) {
            return;
        }

        listener(value);
    };

    const stopWatching = watchItem(item, updateValue);

    readItem(item)
        .then(updateValue)
        .catch(() => updateValue(item.fallback));

    return () => {
        isSubscribed = false;
        stopWatching();
    };
};

/** Whole-area access for schema migrations and the administrator's policy */
export const readStoreData = async (name: Store): Promise<StoredData> => getStore(name).get(null);

/** Calls listener whenever anything in the area changes */
export const watchStoreChanges = (name: Store, listener: VoidFunction): VoidFunction => {
    const onChanged = (_changes: Record<string, chrome.storage.StorageChange>, areaName: string): void => {
        if (areaName !== name) {
            return;
        }

        listener();
    };

    chrome.storage.onChanged.addListener(onChanged);

    return () => chrome.storage.onChanged.removeListener(onChanged);
};

const getRemovedStoreKeys = (currentData: Record<string, unknown>, storedData: StoredData): string[] =>
    Object.keys(currentData).filter(key => !Object.hasOwn(storedData, key));

export const writeStoreData = async (name: Store, storedData: StoredData): Promise<void> => {
    const store = getStore(name);
    const currentStoreData = await store.get(null);

    const removedKeys = getRemovedStoreKeys(currentStoreData, storedData);

    if (removedKeys.length > 0) {
        await store.remove(removedKeys);
    }

    await store.set({ ...storedData });
};

export const restrictLocalStore = async (): Promise<void> => {
    await chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
};
