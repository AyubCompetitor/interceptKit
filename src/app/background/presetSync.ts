import { mocksItem } from '#entities/mock';
import { rulesItem } from '#entities/rule';
import { EMPTY_PRESET, readPresetBundle, replacePolicyRecords } from '#features/transfer';
import { Stores, type TaskQueue } from '#shared/lib';
import {
    prepareWrite,
    readItem,
    watchExtensionStart,
    watchStoreChanges,
    writeItems,
    type ItemWrite,
} from '#shared/platform';

import { readManagedPolicy } from './managedPolicy.ts';
import { getRegexError } from './ruleHandlers.ts';

const isUnchanged = (write: ItemWrite, stored: unknown): boolean =>
    JSON.stringify(write.value) === JSON.stringify(stored);

export const syncPreset = async (): Promise<void> => {
    const policy = await readManagedPolicy();
    const rules = await readItem(rulesItem);
    const mocks = await readItem(mocksItem);

    const { content = EMPTY_PRESET } = readPresetBundle(policy.presetBundle);

    const nextRules = replacePolicyRecords(rules, content.rules);
    const rulesWrite = prepareWrite(rulesItem, nextRules);
    const mocksWrite = prepareWrite(mocksItem, replacePolicyRecords(mocks, content.mocks));

    if (isUnchanged(rulesWrite, rules) && isUnchanged(mocksWrite, mocks)) {
        return;
    }

    const rgxError = await getRegexError(content.rules, nextRules);

    if (rgxError) {
        throw new Error(rgxError);
    }

    await writeItems([rulesWrite, mocksWrite]);
};

export const startPresetSync = (storageReady: Promise<void>, enqueue: TaskQueue): void => {
    const requestSync: VoidFunction = () => {
        enqueue(async () => {
            await storageReady;
            await syncPreset();
        }).catch((error: unknown) => console.error('[preset] sync failed', error));
    };

    watchStoreChanges(Stores.MANAGED, requestSync);

    watchExtensionStart(requestSync);
};
