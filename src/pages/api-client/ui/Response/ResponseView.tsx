import type { FC } from 'react';

import { ResponseSections, type ResponseSection } from '../../lib/requestSections.ts';
import { useSectionChoice } from '../../lib/useSectionChoice.ts';

import type { ApiResponse } from '#entities/request';
import { API_CLIENT_CONFIG } from '#shared/config';
import { useTranslation, type MessageKey } from '#shared/i18n';
import { Flex, Notice, NoticeTones, SegmentedControl, Spaces } from '#shared/ui';

import { ResponseBody } from './ResponseBody.tsx';
import { formatSize } from './responseFormat.ts';
import { ResponseHeaders } from './ResponseHeaders.tsx';
import { ResponseSummary } from './ResponseSummary.tsx';

const RESPONSE_SECTION_LABELS: Record<ResponseSection, MessageKey> = {
    [ResponseSections.BODY]: 'apiClientResponseBody',
    [ResponseSections.HEADERS]: 'apiClientResponseHeaders',
};

interface ResponseViewProps {
    /** What came back */
    response: ApiResponse;
}

export const ResponseView: FC<ResponseViewProps> = ({ response }) => {
    const { locale, t } = useTranslation();
    const { section, onSectionChange } = useSectionChoice<ResponseSection>(ResponseSections.BODY);

    const isBody = section === ResponseSections.BODY;

    return (
        <Flex direction='column' gap={Spaces.L}>
            <ResponseSummary response={response} />

            {response.isTruncated && (
                <Notice tone={NoticeTones.WARNING}>
                    {t('apiClientResponseTruncated', formatSize(API_CLIENT_CONFIG.MAX_RESPONSE_BYTES, locale, t))}
                </Notice>
            )}

            <SegmentedControl
                labels={RESPONSE_SECTION_LABELS}
                legend={t('apiClientResponseSections')}
                value={section}
                isLegendHidden
                onChange={onSectionChange}
            />

            {isBody && <ResponseBody response={response} />}

            {!isBody && <ResponseHeaders headers={response.headers} />}
        </Flex>
    );
};
