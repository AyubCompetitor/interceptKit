import { useId, type FC } from 'react';

import { useStoredBundle } from '../../model/useStoredBundle.ts';

import { useTranslation } from '#shared/i18n';
import { Flex, Spaces } from '#shared/ui';

import { SectionHeader } from '../SectionHeader/SectionHeader.tsx';
import { BundleExport } from './BundleExport.tsx';
import { BundleImport } from './BundleImport.tsx';

export const TransferSection: FC = () => {
    const titleId = useId();
    const { t } = useTranslation();
    const { content, isLoading } = useStoredBundle();

    return (
        <Flex aria-labelledby={titleId} as='section' direction='column' gap={Spaces.XL}>
            <SectionHeader description={t('transferDescription')} title={t('transferTitle')} titleId={titleId} />

            {!isLoading && <BundleExport content={content} />}

            {!isLoading && <BundleImport content={content} />}
        </Flex>
    );
};
