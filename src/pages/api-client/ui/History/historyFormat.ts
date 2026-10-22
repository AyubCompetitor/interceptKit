import type { Locale } from '#shared/config';

const SENT_AT_FORMAT = { dateStyle: 'short', timeStyle: 'short' } as const;

/** Date and time of sending in the language of the interface */
export const formatSentAt = (sentAt: number, locale: Locale): string => {
    return new Intl.DateTimeFormat(locale, SENT_AT_FORMAT).format(sentAt);
};
