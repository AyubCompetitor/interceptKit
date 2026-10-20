import type { FC } from 'react';

import { useSiteList } from '../model/useSiteList.ts';

import { useTranslation } from '#shared/i18n';
import { Button, ButtonSizes, Flex, Spaces, Typography, TypographyColors } from '#shared/ui';

import styles from './SiteList.module.css';
import { SiteName } from './SiteName.tsx';

export const SiteList: FC = () => {
    const { t } = useTranslation();
    const { patterns, isRemoveFailed, onSiteRemove } = useSiteList();

    if (!patterns) {
        return null;
    }

    if (!patterns.length) {
        return <Typography color={TypographyColors.HINT}>{t('sitesEmpty')}</Typography>;
    }

    return (
        <Flex direction='column' gap={Spaces.S}>
            <ul className={styles.list}>
                {patterns.map(pattern => (
                    <Flex key={pattern} align='center' as='li' className={styles.site} gap={Spaces.M} justify='between'>
                        <SiteName pattern={pattern} />
                        <Button size={ButtonSizes.SMALL} onClick={() => onSiteRemove(pattern)}>
                            {t('sitesRemove')}
                        </Button>
                    </Flex>
                ))}
            </ul>

            {isRemoveFailed && (
                <Typography color={TypographyColors.DANGER} role='alert'>
                    {t('sitesRemoveFailed')}
                </Typography>
            )}
        </Flex>
    );
};
