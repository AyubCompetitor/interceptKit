import type { FC } from 'react';

import { useRequestDraftFields } from '../../lib/useRequestDraftFields.ts';
import { getDroppedHeaderNames, type RequestDraftFields } from '../../model/requestDraft.ts';

import { useTranslation } from '#shared/i18n';
import { Flex, KeyValueTable, Notice, NoticeTones, Spaces } from '#shared/ui';

import { HEADER_LABELS } from './requestLabels.ts';

const NAME_SEPARATOR = ', ';

/** Request headers; the ones the browser drops are named, so nobody expects them on the server */
export const RequestHeaderFields: FC<RequestDraftFields> = ({ draft, onDraftChange }) => {
    const { t } = useTranslation();
    const { onHeadersChange } = useRequestDraftFields(draft, onDraftChange);

    const droppedNames = getDroppedHeaderNames(draft);
    const hasDroppedHeaders = droppedNames.length > 0;

    return (
        <Flex direction='column' gap={Spaces.L}>
            <KeyValueTable labels={HEADER_LABELS} rows={draft.headers} onRowsChange={onHeadersChange} />

            {hasDroppedHeaders && (
                <Notice tone={NoticeTones.WARNING}>
                    {t('apiClientForbiddenHeaders', droppedNames.join(NAME_SEPARATOR))}
                </Notice>
            )}
        </Flex>
    );
};
