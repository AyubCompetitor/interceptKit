import { useState, type ChangeEvent } from 'react';

import {
    DEFAULT_SETTINGS,
    isLocalePreference,
    settingsItem,
    settingsRpc,
    type LocalePreference,
} from '#entities/config';
import { executeRpc } from '#shared/messaging';
import { useStorageItem } from '#shared/platform';

export const useLanguageSettings = () => {
    const settings = useStorageItem(settingsItem);
    const [isSaveFailed, setIsSaveFailed] = useState(false);

    const locale = settings?.locale ?? DEFAULT_SETTINGS.locale;

    const onLocaleSave = (nextLocale: LocalePreference) => {
        executeRpc(settingsRpc.update, { locale: nextLocale })
            .then(() => setIsSaveFailed(false))
            .catch(() => setIsSaveFailed(true));
    };

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
