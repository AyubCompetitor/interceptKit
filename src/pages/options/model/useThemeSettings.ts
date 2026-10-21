import { useState } from 'react';

import { DEFAULT_SETTINGS, resolveTheme, settingsItem, settingsRpc, type Theme } from '#entities/config';
import { executeRpc } from '#shared/messaging';
import { useStorageItem } from '#shared/platform';

export const useThemeSettings = () => {
    const [isSaveFailed, setIsSaveFailed] = useState(false);

    const settings = useStorageItem(settingsItem);
    const theme = resolveTheme(settings ?? DEFAULT_SETTINGS);

    const onThemeChange = (nextTheme: Theme) => {
        executeRpc(settingsRpc.update, { theme: nextTheme })
            .then(() => setIsSaveFailed(false))
            .catch(() => setIsSaveFailed(true));
    };

    return {
        theme,
        isSaveFailed,
        onThemeChange,
    };
};
