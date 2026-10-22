import { Stores } from '#shared/lib';

interface StorageChange {
    /** Value after the change */
    newValue?: unknown;
    /** Value before the change */
    oldValue?: unknown;
}

type ChangeListener = (changes: Record<string, StorageChange>, area: string) => void;

/** In-memory stand-in for the parts of chrome.storage the adapter uses, returns the stored data */
export const installFakeStorage = (): Record<string, unknown> => {
    const data: Record<string, unknown> = {};
    const listeners = new Set<ChangeListener>();

    const local = {
        get: async (key: Nullable<string>) => {
            if (key === null) {
                return { ...data };
            }

            return Object.hasOwn(data, key) ? { [key]: data[key] } : {};
        },
        set: async (items: Record<string, unknown>) => {
            for (const [key, newValue] of Object.entries(items)) {
                const oldValue = data[key];

                data[key] = newValue;

                for (const listener of listeners) {
                    listener(
                        {
                            [key]: {
                                newValue,
                                oldValue,
                            },
                        },
                        Stores.LOCAL,
                    );
                }
            }
        },
        remove: async (keys: readonly string[]) => {
            for (const key of keys) {
                Reflect.deleteProperty(data, key);
            }
        },
    };

    const onChanged = {
        addListener: (listener: ChangeListener) => listeners.add(listener),
        removeListener: (listener: ChangeListener) => listeners.delete(listener),
    };

    Object.defineProperty(globalThis, 'chrome', {
        configurable: true,
        value: {
            storage: {
                local,
                onChanged,
            },
        },
    });

    return data;
};

type RegisteredScript = chrome.scripting.RegisteredContentScript;

/** The parts of chrome.scripting the adapter uses */
interface ScriptingApi {
    /** Lists registered scripts with the given ids */
    getRegisteredContentScripts: (filter: chrome.scripting.ContentScriptFilter) => Promise<RegisteredScript[]>;
    /** Registers scripts */
    registerContentScripts: (scripts: RegisteredScript[]) => Promise<void>;
    /** Unregisters scripts with the given ids */
    unregisterContentScripts: (filter: chrome.scripting.ContentScriptFilter) => Promise<void>;
}

export interface FakeScripting {
    /** Scripts registered now */
    registered: RegisteredScript[];
    /** The stand-in installed as chrome.scripting */
    api: ScriptingApi;
}

const DUPLICATE_SCRIPT_ID = 'Duplicate script ID';

/** In-memory stand-in for chrome.scripting registrations */
export const installFakeScripting = (): FakeScripting => {
    const fake: FakeScripting = {
        registered: [],
        api: {
            getRegisteredContentScripts: async ({ ids = [] }) =>
                fake.registered.filter(script => ids.includes(script.id)),
            registerContentScripts: async scripts => {
                const isDuplicate = scripts.some(script => fake.registered.some(current => current.id === script.id));

                if (isDuplicate) {
                    throw new Error(DUPLICATE_SCRIPT_ID);
                }

                fake.registered = [...fake.registered, ...scripts];
            },
            unregisterContentScripts: async ({ ids = [] }) => {
                fake.registered = fake.registered.filter(script => !ids.includes(script.id));
            },
        },
    };

    Object.defineProperty(globalThis, 'chrome', {
        configurable: true,
        value: {
            scripting: fake.api,
        },
    });

    return fake;
};
