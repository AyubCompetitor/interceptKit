import { applySettingsPatch, settingsItem, settingsRpc, type SettingsPatch } from '#entities/config';
import type { TaskQueue } from '#shared/lib';
import type { Router } from '#shared/messaging';
import { readItem, writeItem } from '#shared/platform';

const updateSettings = async (patch: SettingsPatch, storageReady: Promise<void>) => {
    await storageReady;

    const currentItem = await readItem(settingsItem);
    const nextItem = applySettingsPatch(currentItem, patch);

    await writeItem(settingsItem, nextItem);

    return nextItem;
};

export const registerSettingsHandlers = (router: Router, storageReady: Promise<void>, enqueue: TaskQueue): void => {
    router.on(settingsRpc.update, patch => enqueue(() => updateSettings(patch, storageReady)));
};
