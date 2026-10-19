import type { FC } from 'react';

import { useTranslation, type MessageKey } from '#shared/i18n';
import { Flex, Spaces, useDocumentTitle } from '#shared/ui';

import { LanguageSettings } from './LanguageSettings.tsx';
import styles from './OptionsPage.module.css';

/** Dashboard sections that arrive in later phases. */
const UPCOMING_SECTIONS: readonly MessageKey[] = [
    'sectionRules',
    'sectionMocks',
    'sectionSites',
    'sectionPolicy',
    'sectionTransfer',
];

export const OptionsPage: FC = () => {
    const { t } = useTranslation();

    useDocumentTitle(`${t('extName')}: ${t('dashboardSubtitle')}`);

    return (
        <Flex as='main' className={styles.dashboard} direction='column' gap={Spaces.XL}>
            <Flex as='header' direction='column' gap={Spaces.XS}>
                <h1>{t('extName')}</h1>
                <p className={styles.subtitle}>{t('dashboardSubtitle')}</p>
            </Flex>
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
