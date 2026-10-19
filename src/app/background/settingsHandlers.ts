import { applySettingsPatch, settingsItem, settingsRpc } from '#entities/config';
import type { TaskQueue } from '#shared/lib';
import type { Router } from '#shared/messaging';
import { readItem, writeItem } from '#shared/platform';

export const registerSettingsHandlers = (
    router: Router,
    storageReady: Promise<void>,
    runExclusive: TaskQueue,
): void => {
    router.handle(settingsRpc.update, patch =>
        runExclusive(async () => {
            await storageReady;

            const next = applySettingsPatch(await readItem(settingsItem), patch);

            await writeItem(settingsItem, next);

            return next;
        }),
    );
};
