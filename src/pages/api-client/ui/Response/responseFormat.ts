import type { Locale } from '#shared/config';
import type { TFunction } from '#shared/i18n';

const KILOBYTE = 1024;

const MEGABYTE = KILOBYTE * KILOBYTE;

const SIZE_DIGITS = { maximumFractionDigits: 1 } as const;

export const formatDuration = (durationMs: number, locale: Locale, t: TFunction): string => {
    const duration = new Intl.NumberFormat(locale).format(durationMs);

    return t('apiClientDuration', duration);
};

export const formatSize = (size: number, locale: Locale, t: TFunction): string => {
    const numberFormat = new Intl.NumberFormat(locale, SIZE_DIGITS);

    if (size < KILOBYTE) {
        return t('apiClientSizeBytes', numberFormat.format(size));
    }

    if (size < MEGABYTE) {
        return t('apiClientSizeKilobytes', numberFormat.format(size / KILOBYTE));
    }

    return t('apiClientSizeMegabytes', numberFormat.format(size / MEGABYTE));
};
