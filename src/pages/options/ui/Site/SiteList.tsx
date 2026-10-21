import type { FC } from 'react';

import { useSiteList } from '../../model/useSiteList.ts';

import { useTranslation } from '#shared/i18n';
import {
    Button,
    ButtonSizes,
    EmptyState,
    Flex,
    Icon,
    IconNames,
    Spaces,
    Typography,
    TypographyColors,
} from '#shared/ui';

import styles from './SiteList.module.css';
import { SiteName } from './SiteName.tsx';

export const SiteList: FC = () => {
    const { t } = useTranslation();
    const { patterns, isRemoveFailed, onSiteRemove } = useSiteList();

    if (!patterns) {
        return null;
    }

    if (!patterns.length) {
        return <EmptyState description={t('sitesEmptyText')} icon={IconNames.SITES} title={t('sitesEmptyTitle')} />;
    }

    return (
        <Flex direction='column' gap={Spaces.S}>
            <ul className={styles.list}>
                {patterns.map(pattern => (
                    <li key={pattern} className={styles.site}>
                        <Icon className={styles.icon} name={IconNames.SITES} />
                        <SiteName pattern={pattern} />
                        <Button size={ButtonSizes.SMALL} onClick={() => onSiteRemove(pattern)}>
                            {t('sitesRemove')}
                        </Button>
                    </li>
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
