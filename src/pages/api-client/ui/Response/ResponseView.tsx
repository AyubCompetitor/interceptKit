import type { FC } from 'react';

import { ResponseSections, type ResponseSection } from '../../lib/requestSections.ts';
import { useSectionChoice } from '../../lib/useSectionChoice.ts';

import type { ApiResponse } from '#entities/request';
import { useTranslation, type MessageKey } from '#shared/i18n';
import { Flex, SegmentedControl, Spaces } from '#shared/ui';

import { ResponseBody } from './ResponseBody.tsx';
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
    const { t } = useTranslation();
    const { section, onSectionChange } = useSectionChoice<ResponseSection>(ResponseSections.BODY);

    const isBody = section === ResponseSections.BODY;

    return (
        <Flex direction='column' gap={Spaces.L}>
            <ResponseSummary response={response} />

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
