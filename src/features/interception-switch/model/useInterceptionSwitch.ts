import type { ChangeEvent } from 'react';

import { DEFAULT_SETTINGS, settingsItem, settingsRpc } from '#entities/config';
import { executeRpc } from '#shared/messaging';
import { useStorageItem } from '#shared/platform';
import { useProcessAction } from '#shared/ui';

export const useInterceptionSwitch = () => {
    const { isFailed: isSaveFailed, processAction } = useProcessAction();

    const settings = useStorageItem(settingsItem);

    const isEnabled = settings?.enabled ?? DEFAULT_SETTINGS.enabled;

    const onEnabledSave = (enabled: boolean) => processAction(executeRpc(settingsRpc.update, { enabled }));

    const onEnabledChange = (event: ChangeEvent<HTMLInputElement>) => {
        onEnabledSave(event.target.checked);
    };

    const onInterceptionEnable = () => {
        onEnabledSave(true);
    };

    return {
        isEnabled,
        isSaveFailed,
        onEnabledChange,
        onInterceptionEnable,
    };
};
