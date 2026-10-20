import type { FC } from 'react';

import { useRuleDraftFields } from '../lib/useRuleDraftFields.ts';

import { useTranslation } from '#shared/i18n';
import { Flex, Spaces } from '#shared/ui';

import type { DraftFieldsProps } from './DraftFieldsProps.ts';
import { HeaderOpList } from './HeaderOpList.tsx';

export const HeaderFields: FC<DraftFieldsProps> = ({ draft, onDraftChange }) => {
    const { t } = useTranslation();
    const { onRequestHeadersChange, onResponseHeadersChange } = useRuleDraftFields(draft, onDraftChange);

    return (
        <Flex direction='column' gap={Spaces.M}>
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
