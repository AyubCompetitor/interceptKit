import { formatIssues, validate, type Store, type StoreItem, type StoredData } from '#shared/lib';

const getStore = (name: Store): chrome.storage.StorageArea => chrome.storage[name];

/** Validates a stored value */
const parseStored = <T>(item: StoreItem<T>, raw: unknown): T => {
    if (raw === undefined) {
        return item.fallback;
    }

    const result = validate(item.validator, raw);

    if (result.ok) {
        return result.value;
    }

    console.warn(`[storage] ${item.area}.${item.key} is invalid, using defaults:`, formatIssues(result.issues));

    return item.fallback;
};

export const readItem = async <T>(item: StoreItem<T>): Promise<T> => {
    const stored = await getStore(item.area).get(item.key);

    return parseStored(item, stored[item.key]);
};

/** Refuses to persist anything the items validator rejects */
export const writeItem = async <T>(item: StoreItem<T>, value: T): Promise<void> => {
    const result = validate(item.validator, value);

    if (!result.ok) {
        const errorMessage = `Refusing to store invalid ${item.key}: ${formatIssues(result.issues)}`;

        throw new Error(errorMessage);
    }

    await getStore(item.area).set({ [item.key]: result.value });
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

/** Whole-area access for schema migrations and the administrator's policy */
export const readStoreData = async (name: Store): Promise<StoredData> => getStore(name).get(null);

/** Calls listener whenever anything in the area changes */
export const watchStoreChanges = (name: Store, listener: VoidFunction): VoidFunction => {
    const onChanged = (_changes: Record<string, chrome.storage.StorageChange>, areaName: string): void => {
        if (areaName === name) {
            listener();
        }
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

/** Closes storage.local to content scripts */
export const restrictLocalStore = async (): Promise<void> => {
    await chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
};
