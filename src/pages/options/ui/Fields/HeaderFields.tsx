import type { FC } from 'react';

import { useRuleDraftFields } from '../../lib/useRuleDraftFields.ts';
import type { DraftFields } from '../../model/ruleDraft.ts';

import { useTranslation } from '#shared/i18n';
import { Flex, Spaces } from '#shared/ui';

import { HeaderOpList } from '../Operation/HeaderOpList.tsx';

export const HeaderFields: FC<DraftFields> = ({ draft, onDraftChange }) => {
    const { t } = useTranslation();
    const { onRequestHeadersChange, onResponseHeadersChange } = useRuleDraftFields(draft, onDraftChange);

    return (
        <Flex direction='column' gap={Spaces.L}>
            <HeaderOpList
                legend={t('ruleRequestHeaders')}
                ops={draft.requestHeaders}
                onOpsChange={onRequestHeadersChange}
            />
            <HeaderOpList
                legend={t('ruleResponseHeaders')}
                ops={draft.responseHeaders}
                onOpsChange={onResponseHeadersChange}
            />
        </Flex>
    );
};
