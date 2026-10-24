import type { ChangeEvent } from 'react';

import {
    DEFAULT_SETTINGS,
    isLocalePreference,
    settingsItem,
    settingsRpc,
    type LocalePreference,
} from '#entities/config';
import { executeRpc } from '#shared/messaging';
import { useStorageItem } from '#shared/platform';
import { useProcessAction } from '#shared/ui';

export const useLanguageSettings = () => {
    const settings = useStorageItem(settingsItem);
    const { isFailed: isSaveFailed, processAction } = useProcessAction();

    const locale = settings?.locale ?? DEFAULT_SETTINGS.locale;

    const onLocaleSave = (nextLocale: LocalePreference) =>
        processAction(executeRpc(settingsRpc.update, { locale: nextLocale }));

    const onLocaleChange = (event: ChangeEvent<HTMLSelectElement>) => {
        if (!isLocalePreference(event.target.value)) {
            return;
        }

        onLocaleSave(event.target.value);
    };

    return {
        locale,
        isSaveFailed,
        onLocaleChange,
    };
};
