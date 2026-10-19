import {
    DEFAULT_SETTINGS,
    settingsPatchValidator,
    settingsValidator,
    type Settings,
    type SettingsPatch,
} from '../model/settings.ts';

import { defineMethod, defineStore, Stores } from '#shared/lib';

export const settingsItem = defineStore<Settings>({
    key: 'settings',
    area: Stores.LOCAL,
    fallback: DEFAULT_SETTINGS,
    validator: settingsValidator,
});

export const settingsRpc = {
    update: defineMethod<SettingsPatch, Settings>('settings/update', settingsPatchValidator),
} as const;
