import { useState, type ChangeEvent } from 'react';

import { DEFAULT_SETTINGS, settingsItem, settingsRpc } from '#entities/config';
import { executeRpc } from '#shared/messaging';
import { useStorageItem } from '#shared/platform';

export const useInterceptionSwitch = () => {
    const [isSaveFailed, setIsSaveFailed] = useState(false);

    const settings = useStorageItem(settingsItem);

    const isEnabled = settings?.enabled ?? DEFAULT_SETTINGS.enabled;

    const onEnabledSave = (enabled: boolean) => {
        executeRpc(settingsRpc.update, { enabled })
            .then(() => setIsSaveFailed(false))
            .catch(() => setIsSaveFailed(true));
    };

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
