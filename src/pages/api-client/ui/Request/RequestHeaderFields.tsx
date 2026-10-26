import type { FC } from 'react';

import { useRequestDraftFields } from '../../lib/useRequestDraftFields.ts';
import { getBrowserHeaderNames, getRuleHeaderNames, type RequestDraftFields } from '../../model/requestDraft.ts';

import { useTranslation } from '#shared/i18n';
import { Flex, KeyValueTable, Notice, NoticeTones, Spaces } from '#shared/ui';

import { HEADER_LABELS } from './requestLabels.ts';

const NAME_SEPARATOR = ', ';

/** Request headers; the ones fetch() cannot send are named with what happens to them */
export const RequestHeaderFields: FC<RequestDraftFields> = ({ draft, onDraftChange }) => {
    const { t } = useTranslation();
    const { onHeadersChange } = useRequestDraftFields(draft, onDraftChange);

    const ruleNames = getRuleHeaderNames(draft);
    const browserNames = getBrowserHeaderNames(draft);

    return (
        <Flex direction='column' gap={Spaces.L}>
            <KeyValueTable labels={HEADER_LABELS} rows={draft.headers} isWithTemplates onRowsChange={onHeadersChange} />

            {!!ruleNames.length && (
                <Notice tone={NoticeTones.INFO}>{t('apiClientRuleHeaders', ruleNames.join(NAME_SEPARATOR))}</Notice>
            )}

            {!!browserNames.length && (
                <Notice tone={NoticeTones.WARNING}>
                    {t('apiClientBrowserHeaders', browserNames.join(NAME_SEPARATOR))}
                </Notice>
            )}
        </Flex>
    );
};
