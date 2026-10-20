import { useId, type FC } from 'react';

import { useTranslation } from '#shared/i18n';
import { Flex, Spaces, Typography, TypographyColors } from '#shared/ui';

import { SiteForm } from './SiteForm.tsx';
import { SiteList } from './SiteList.tsx';

export const SitesSection: FC = () => {
    const id = useId();
    const { t } = useTranslation();

    return (
        <Flex aria-labelledby={`${id}-title`} as='section' direction='column' gap={Spaces.M}>
            <h2 id={`${id}-title`}>{t('sectionSites')}</h2>

            <Typography color={TypographyColors.HINT}>{t('sitesHint')}</Typography>

            <SiteForm />

            <SiteList />
        </Flex>
    );
};
