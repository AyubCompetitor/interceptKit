import type { FC } from 'react';

import type { ApiResponse } from '#entities/request';
import { useTranslation } from '#shared/i18n';
import { Flex, Spaces, StatusCode, Typography, TypographyColors, TypographySizes } from '#shared/ui';

import { formatDuration, formatSize } from './responseFormat.ts';

interface ResponseSummaryProps {
    /** What came back */
    response: ApiResponse;
}

export const ResponseSummary: FC<ResponseSummaryProps> = ({ response }) => {
    const { locale, t } = useTranslation();

    const statusLine = `${response.status} ${response.statusText}`.trim();

    return (
        <Flex align='baseline' gap={Spaces.L} isWrapped>
            <StatusCode status={response.status} text={statusLine} />

            <Typography as='span' color={TypographyColors.HINT} size={TypographySizes.SMALL}>
                {formatDuration(response.durationMs, locale, t)}
            </Typography>

            <Typography as='span' color={TypographyColors.HINT} size={TypographySizes.SMALL}>
                {formatSize(response.size, locale, t)}
            </Typography>
        </Flex>
    );
};
