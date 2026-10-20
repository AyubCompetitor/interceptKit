import { useState, type ChangeEvent } from 'react';

import { DEFAULT_SETTINGS, settingsItem, settingsRpc } from '#entities/config';
import { executeRpc } from '#shared/messaging';
import { useStorageItem } from '#shared/platform';

export const useInterceptionSwitch = () => {
    const settings = useStorageItem(settingsItem);
    const [isSaveFailed, setIsSaveFailed] = useState(false);

    const isEnabled = settings?.enabled ?? DEFAULT_SETTINGS.enabled;

    const onEnabledChange = (event: ChangeEvent<HTMLInputElement>) => {
        executeRpc(settingsRpc.update, { enabled: event.target.checked })
            .then(() => setIsSaveFailed(false))
            .catch(() => setIsSaveFailed(true));
    };

    return {
        isEnabled,
        isSaveFailed,
        onEnabledChange,
    };
};
