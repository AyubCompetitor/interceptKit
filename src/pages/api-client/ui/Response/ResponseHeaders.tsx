import type { FC } from 'react';

import type { HeaderEntry } from '#entities/request';
import { useTranslation } from '#shared/i18n';
import { Flex, Spaces, Typography, TypographyColors, TypographySizes } from '#shared/ui';

import styles from './ResponseHeaders.module.css';

interface ResponseHeadersProps {
    /** Headers of the response, one per name */
    headers: readonly HeaderEntry[];
}

export const ResponseHeaders: FC<ResponseHeadersProps> = ({ headers }) => {
    const { t } = useTranslation();

    return (
        <Flex direction='column' gap={Spaces.M}>
            <dl className={styles.list}>
                {headers.map(([name, value]) => (
                    <div key={name} className={styles.row}>
                        <dt className={styles.name}>{name}</dt>
                        <dd className={styles.value}>{value}</dd>
                    </div>
                ))}
            </dl>

            <Typography color={TypographyColors.HINT} size={TypographySizes.SMALL}>
                {t('apiClientResponseCookiesNote')}
            </Typography>
        </Flex>
    );
};
