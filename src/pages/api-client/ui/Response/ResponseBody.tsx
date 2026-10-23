import type { FC } from 'react';

import { getResponseBodyView, ResponseBodyViewTypes } from '../../model/responseBody.ts';

import type { ApiResponse } from '#entities/request';
import { useTranslation } from '#shared/i18n';
import { CodeEditor, CodeLanguages, Typography, TypographyColors } from '#shared/ui';

interface ResponseBodyProps {
    /** What came back */
    response: ApiResponse;
}

const BODY_MAX_ROWS = 30;

export const ResponseBody: FC<ResponseBodyProps> = ({ response }) => {
    const { t } = useTranslation();

    const view = getResponseBodyView(response);

    if (view.viewType === ResponseBodyViewTypes.EMPTY) {
        return <Typography color={TypographyColors.HINT}>{t('apiClientResponseNoBody')}</Typography>;
    }

    if (view.viewType === ResponseBodyViewTypes.BINARY) {
        return <Typography color={TypographyColors.HINT}>{t('apiClientResponseBinary', view.contentType)}</Typography>;
    }

    return (
        <CodeEditor
            label={t('apiClientResponseBodyEditor')}
            language={view.viewType === ResponseBodyViewTypes.JSON ? CodeLanguages.JSON : CodeLanguages.TEXT}
            maxRows={BODY_MAX_ROWS}
            value={view.text}
            isReadOnly
        />
    );
};
