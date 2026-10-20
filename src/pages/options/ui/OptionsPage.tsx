import type { FC } from 'react';

import { useTranslation, type MessageKey } from '#shared/i18n';
import { createDocumentTitle, Flex, Spaces, Typography, TypographyColors, useDocumentTitle } from '#shared/ui';

import { InterceptionSwitch } from './InterceptionSwitch.tsx';
import { LanguageSettings } from './LanguageSettings.tsx';
import styles from './OptionsPage.module.css';
import { RulesSection } from './RulesSection.tsx';
import { SitesSection } from './SitesSection.tsx';

/** Dashboard sections that arrive in later phases. */
const UPCOMING_SECTIONS: readonly MessageKey[] = ['sectionMocks', 'sectionPolicy', 'sectionTransfer'];

export const OptionsPage: FC = () => {
    const { t } = useTranslation();
    const title = createDocumentTitle('extName', 'dashboardSubtitle', t);

    useDocumentTitle(title);

    return (
        <Flex as='main' className={styles.dashboard} direction='column' gap={Spaces.XL}>
            <Flex align='center' as='header' gap={Spaces.L} justify='between' isWrapped>
                <Flex direction='column' gap={Spaces.XS}>
                    <h1>{t('extName')}</h1>
                    <Typography color={TypographyColors.HINT}>{t('dashboardSubtitle')}</Typography>
                </Flex>
                <InterceptionSwitch />
            </Flex>
            <RulesSection />
            <SitesSection />
            <Flex aria-labelledby='upcoming-title' as='section' direction='column' gap={Spaces.S}>
                <h2 id='upcoming-title'>{t('dashboardUpcomingTitle')}</h2>
                <ul className={styles.upcoming}>
                    {UPCOMING_SECTIONS.map(key => (
                        <li key={key}>{t(key)}</li>
                    ))}
                </ul>
            </Flex>
            <LanguageSettings />
        </Flex>
    );
};
