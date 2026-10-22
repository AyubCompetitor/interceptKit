import type { FC } from 'react';

import { isErrorStatus, type ApiResponse } from '#entities/request';
import { useTranslation } from '#shared/i18n';
import { Flex, Spaces, Typography, TypographyColors, TypographySizes } from '#shared/ui';

import { formatDuration, formatSize } from './responseFormat.ts';
import styles from './ResponseSummary.module.css';

interface ResponseSummaryProps {
    /** What came back */
    response: ApiResponse;
}

/** The status, red for errors, then how long the response took and how big its body is */
export const ResponseSummary: FC<ResponseSummaryProps> = ({ response }) => {
    const { locale, t } = useTranslation();

    const statusColor = isErrorStatus(response.status) ? TypographyColors.DANGER : TypographyColors.PRIMARY;
    const statusLine = `${response.status} ${response.statusText}`.trim();

    return (
        <Flex align='baseline' gap={Spaces.L} isWrapped>
            <Typography as='span' className={styles.status} color={statusColor}>
                {statusLine}
            </Typography>

            <Typography as='span' color={TypographyColors.HINT} size={TypographySizes.SMALL}>
                {formatDuration(response.durationMs, locale, t)}
            </Typography>

            <Typography as='span' color={TypographyColors.HINT} size={TypographySizes.SMALL}>
                {formatSize(response.size, locale, t)}
            </Typography>
        </Flex>
    );
};
