import { useId, type FC } from 'react';

import { useTranslation } from '#shared/i18n';
import { Flex, Notice, Spaces } from '#shared/ui';

import { LanguageSettings } from '../LanguageSettings/LanguageSettings.tsx';
import { SectionHeader } from '../SectionHeader/SectionHeader.tsx';
import styles from './SettingsSection.module.css';
import { ThemeSettings } from '../ThemeSettings/ThemeSettings.tsx';

export const SettingsSection: FC = () => {
    const titleId = useId();

    const { t } = useTranslation();

    return (
        <Flex aria-labelledby={titleId} as='section' direction='column' gap={Spaces.XL}>
            <SectionHeader description={t('settingsDescription')} title={t('settingsTitle')} titleId={titleId} />

            <Flex className={styles.card} direction='column' gap={Spaces.XL}>
                <LanguageSettings />
                <ThemeSettings />
            </Flex>

            <Notice>{t('settingsPrivacy')}</Notice>
        </Flex>
    );
};
