import { SUPPORTED_LOCALES, type Locale } from '#shared/config';
import { boolean, object, oneOf, optional, refine, type Validator } from '#shared/lib';


export interface Settings {
    /** Master switch for all interception  */
    readonly enabled: boolean;
    /** Interface language */
    readonly locale: LocalePreference;
}

export type LocalePreference = 'auto' | Locale;

export type SettingsPatch = Partial<Settings>;

export const DEFAULT_SETTINGS: Settings = { enabled: true, locale: 'auto' };

const localePreference = oneOf(['auto', ...SUPPORTED_LOCALES]);

export const settingsValidator: Validator<Settings> = object({ enabled: boolean(), locale: localePreference });

export const settingsPatchValidator: Validator<SettingsPatch> = refine(
    object({ enabled: optional(boolean()), locale: optional(localePreference) }),
    patch => (Object.keys(patch).length === 0 ? 'the patch changes nothing' : undefined),
);

export const applySettingsPatch = (settings: Settings, patch: SettingsPatch): Settings => ({ ...settings, ...patch });
