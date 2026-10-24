import { DEFAULT_SETTINGS, resolveTheme, settingsItem, settingsRpc, type Theme } from '#entities/config';
import { executeRpc } from '#shared/messaging';
import { useStorageItem } from '#shared/platform';
import { useProcessAction } from '#shared/ui';

export const useThemeSettings = () => {
    const { isFailed: isSaveFailed, processAction } = useProcessAction();

    const settings = useStorageItem(settingsItem);
    const theme = resolveTheme(settings ?? DEFAULT_SETTINGS);

    const onThemeChange = (nextTheme: Theme) => processAction(executeRpc(settingsRpc.update, { theme: nextTheme }));

    return {
        theme,
        isSaveFailed,
        onThemeChange,
    };
};
