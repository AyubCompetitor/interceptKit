import { Themes, type Theme } from '#entities/config';
import type { MessageKey } from '#shared/i18n';

/** Labels of the themes; the key order is the order of the choices */
export const THEME_LABELS: Record<Theme, MessageKey> = {
    [Themes.DARK]: 'themeDark',
    [Themes.LIGHT]: 'themeLight',
    [Themes.SYSTEM]: 'themeSystem',
};
