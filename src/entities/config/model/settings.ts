import { SUPPORTED_LOCALES, type Locale } from '#shared/config';
import { boolean, object, oneOf, optional, refine, validate, type Validator } from '#shared/lib';

export interface Settings {
    /** Master switch for all interception */
    readonly enabled: boolean;
    /** Interface language */
    readonly locale: LocalePreference;
}

export type LocalePreference = 'auto' | Locale;

export type SettingsPatch = Partial<Settings>;

export const DEFAULT_SETTINGS: Settings = { enabled: true, locale: 'auto' };

const SETTINGS_ERRORS = {
    EMPTY_PATCH: 'the patch changes nothing',
} as const;

const getEmptyPatchError = (patch: SettingsPatch): NotRequired<string> => {
    const isEmpty = Object.keys(patch).length === 0;

    if (isEmpty) {
        return SETTINGS_ERRORS.EMPTY_PATCH;
    }

    return;
};

const localePreference = oneOf(['auto', ...SUPPORTED_LOCALES]);

/** Narrows a string, e.g. a select value, to a supported preference */
export const isLocalePreference = (value: string): value is LocalePreference => validate(localePreference, value).ok;

export const settingsValidator: Validator<Settings> = object({ enabled: boolean(), locale: localePreference });

export const settingsPatchValidator: Validator<SettingsPatch> = refine(
    object({ enabled: optional(boolean()), locale: optional(localePreference) }),
    getEmptyPatchError,
);

export const applySettingsPatch = (settings: Settings, patch: SettingsPatch): Settings => ({
    ...settings,
    ...patch,
});
