import { useId, type FC } from 'react';

import { useTranslation } from '#shared/i18n';
import { Flex, Spaces } from '#shared/ui';

import { SectionHeader } from '../SectionHeader/SectionHeader.tsx';
import { SiteForm } from './SiteForm.tsx';
import { SiteList } from './SiteList.tsx';

export const SitesSection: FC = () => {
    const titleId = useId();

    const { t } = useTranslation();

    return (
        <Flex aria-labelledby={titleId} as='section' direction='column' gap={Spaces.XL}>
            <SectionHeader description={t('sitesDescription')} title={t('sitesTitle')} titleId={titleId} />

            <SiteForm />

            <SiteList />
        </Flex>
    );
};
