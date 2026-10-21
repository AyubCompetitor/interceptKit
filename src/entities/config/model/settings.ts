import { SUPPORTED_LOCALES, type Locale } from '#shared/config';
import { boolean, object, oneOf, optional, refine, validate, type Validator } from '#shared/lib';

export enum Themes {
    DARK = 'dark',
    LIGHT = 'light',
    SYSTEM = 'system',
}

export type Theme = `${Themes}`;

export const THEMES = Object.values(Themes);

export interface Settings {
    /** Master switch for all interception */
    readonly enabled: boolean;
    /** Interface language */
    readonly locale: LocalePreference;
    /** Color theme of the extension pages; settings saved before themes existed have none */
    readonly theme?: Theme;
}

export type LocalePreference = 'auto' | Locale;

export type SettingsPatch = Partial<Settings>;

export const DEFAULT_SETTINGS: Settings = { enabled: true, locale: 'auto', theme: Themes.DARK };

const SETTINGS_ERRORS = {
    EMPTY_PATCH: 'the patch changes nothing',
} as const;

const getEmptyPatchError = (patch: SettingsPatch): NotRequired<string> => {
    const isEmpty = Object.keys(patch).length === 0;

    if (!isEmpty) {
        return;
    }

    return SETTINGS_ERRORS.EMPTY_PATCH;
};

const localePreference = oneOf(['auto', ...SUPPORTED_LOCALES]);

const theme = oneOf(THEMES);

/** Narrows a string, e.g. a select value, to a supported preference */
export const isLocalePreference = (value: string): value is LocalePreference => validate(localePreference, value).ok;

/** The theme to show: dark unless the user chose another one */
export const resolveTheme = (settings: Settings): Theme => settings.theme ?? Themes.DARK;

export const settingsValidator: Validator<Settings> = object({
    enabled: boolean(),
    locale: localePreference,
    theme: optional(theme),
});

export const settingsPatchValidator: Validator<SettingsPatch> = refine(
    object({ enabled: optional(boolean()), locale: optional(localePreference), theme: optional(theme) }),
    getEmptyPatchError,
);

export const applySettingsPatch = (settings: Settings, patch: SettingsPatch): Settings => ({
    ...settings,
    ...patch,
});
