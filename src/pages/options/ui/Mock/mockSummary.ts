import type { Mock } from '#entities/mock';
import type { TFunction } from '#shared/i18n';

const SUMMARY_SEPARATOR = ' · ';

const getMethodsPart = (mock: Mock, t: TFunction): NotRequired<string> => {
    const { methods } = mock.match;

    if (methods === undefined) {
        return;
    }

    return t('mockSummaryMethods', methods.join(', '));
};

const getDelayPart = (mock: Mock, t: TFunction): NotRequired<string> => {
    const { delayMs } = mock.response;

    if (delayMs === 0) {
        return;
    }

    return t('mockSummaryDelay', String(delayMs));
};

/** What narrows or slows the mock, for the list; nothing for a mock without either */
export const getMockSummary = (mock: Mock, t: TFunction): NotRequired<string> => {
    const parts = [getMethodsPart(mock, t), getDelayPart(mock, t)].filter(part => part !== undefined);

    if (parts.length === 0) {
        return;
    }

    return parts.join(SUMMARY_SEPARATOR);
};
