import { ResponseSections, type ResponseSection } from '../../lib/requestSections.ts';

import type { MessageKey } from '#shared/i18n';

/** Parts of a received response; the key order is the order of the options */
export const RESPONSE_SECTION_LABELS: Record<ResponseSection, MessageKey> = {
    [ResponseSections.BODY]: 'apiClientResponseBody',
    [ResponseSections.HEADERS]: 'apiClientResponseHeaders',
};
