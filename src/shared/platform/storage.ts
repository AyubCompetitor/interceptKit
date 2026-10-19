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
        throw new Error(`Refusing to store invalid ${item.key}: ${formatIssues(result.issues)}`);
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

/** Whole-area access for schema migrations */
export const readArea = async (name: Store): Promise<StoredData> => getStore(name).get(null);

export const replaceArea = async (name: Store, data: StoredData): Promise<void> => {
    const area = getStore(name);
    const current = await area.get(null);
    const removed = Object.keys(current).filter(key => !Object.hasOwn(data, key));

    if (removed.length > 0) {
        await area.remove(removed);
    }

    await area.set({ ...data });
};

/** Closes storage.local to content scripts */
export const restrictLocalStorageToExtension = async (): Promise<void> => {
    await chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
};
