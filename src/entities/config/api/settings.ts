import {
    DEFAULT_SETTINGS,
    settingsPatchValidator,
    settingsValidator,
    type Settings,
    type SettingsPatch,
} from '../model/settings.ts';

import { defineMethod, defineStoreItem, Stores } from '#shared/lib';

export const settingsItem = defineStoreItem<Settings>({
    key: 'settings',
    area: Stores.LOCAL,
    fallback: DEFAULT_SETTINGS,
    validator: settingsValidator,
});

export const settingsRpc = {
    update: defineMethod<SettingsPatch, Settings>('settings/update', settingsPatchValidator),
} as const;
