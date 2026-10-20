import type { Validator } from './validation.ts';

export enum Stores {
    LOCAL = 'local',
    SESSION = 'session',
    /** Read-only area filled by the administrator's policy */
    MANAGED = 'managed',
}

export type Store = `${Stores}`;

/** A typed chrome.storage key */
export interface StoreItem<T> {
    /** Area that holds the key */
    readonly area: Store;
    /** Key inside the area */
    readonly key: string;
    /** Checks stored data before use and new data before writing */
    readonly validator: Validator<T>;
    /** Used when the key is missing or holds data that fails validation */
    readonly fallback: T;
}

export const defineStoreItem = <T>(item: StoreItem<T>): StoreItem<T> => Object.freeze(item);
