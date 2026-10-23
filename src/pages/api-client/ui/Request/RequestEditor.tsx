import type { FC } from 'react';

import { RequestSections, type RequestSection } from '../../lib/requestSections.ts';
import { useRequestDraftFields } from '../../lib/useRequestDraftFields.ts';
import { useSectionChoice } from '../../lib/useSectionChoice.ts';
import type { RequestDraftFields } from '../../model/requestDraft.ts';

import { useTranslation } from '#shared/i18n';
import { Flex, KeyValueTable, SegmentedControl, Spaces } from '#shared/ui';

import { RequestBodyFields } from './RequestBodyFields.tsx';
import { RequestHeaderFields } from './RequestHeaderFields.tsx';
import { QUERY_LABELS, REQUEST_SECTION_LABELS } from './requestLabels.ts';
import { RequestSettingsFields } from './RequestSettingsFields.tsx';

export const RequestEditor: FC<RequestDraftFields> = ({ draft, onDraftChange }) => {
    const { t } = useTranslation();
    const { section, onSectionChange } = useSectionChoice<RequestSection>(RequestSections.PARAMS);
    const { onQueryChange } = useRequestDraftFields(draft, onDraftChange);

    const isParams = section === RequestSections.PARAMS;
    const isHeaders = section === RequestSections.HEADERS;
    const isBody = section === RequestSections.BODY;
    const isSettings = section === RequestSections.SETTINGS;

    return (
        <Flex direction='column' gap={Spaces.L}>
            <SegmentedControl
                labels={REQUEST_SECTION_LABELS}
                legend={t('apiClientSections')}
                value={section}
                isLegendHidden
                onChange={onSectionChange}
            />

            {isParams && <KeyValueTable labels={QUERY_LABELS} rows={draft.query} onRowsChange={onQueryChange} />}

            {isHeaders && <RequestHeaderFields draft={draft} onDraftChange={onDraftChange} />}

            {isBody && <RequestBodyFields draft={draft} onDraftChange={onDraftChange} />}

            {isSettings && <RequestSettingsFields draft={draft} onDraftChange={onDraftChange} />}
        </Flex>
    );
};
