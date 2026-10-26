import type { FC } from 'react';

import { useRequestDraftFields } from '../../lib/useRequestDraftFields.ts';
import type { RequestDraftFields } from '../../model/requestDraft.ts';

import { isBodylessMethod, RequestBodyTypes } from '#entities/request';
import { useTranslation } from '#shared/i18n';
import {
    CodeEditor,
    CodeLanguages,
    Field,
    Flex,
    KeyValueTable,
    Notice,
    SegmentedControl,
    Spaces,
    Typography,
    TypographyColors,
    TypographySizes,
} from '#shared/ui';

import { BODY_TYPE_LABELS, FORM_FIELD_LABELS } from './requestLabels.ts';

export const RequestBodyFields: FC<RequestDraftFields> = ({ draft, onDraftChange }) => {
    const { t } = useTranslation();
    const { onBodyTypeChange, onJsonBodyChange, onRawBodyChange, onRawContentTypeChange, onFormFieldsChange } =
        useRequestDraftFields(draft, onDraftChange);

    const isNone = draft.bodyType === RequestBodyTypes.NONE;
    const isJson = draft.bodyType === RequestBodyTypes.JSON;
    const isRaw = draft.bodyType === RequestBodyTypes.RAW;
    const isForm = draft.bodyType === RequestBodyTypes.FORM;
    const isBodyless = isBodylessMethod(draft.method);

    return (
        <Flex direction='column' gap={Spaces.L}>
            {isBodyless && <Notice>{t('apiClientBodyless', draft.method)}</Notice>}

            <SegmentedControl
                labels={BODY_TYPE_LABELS}
                legend={t('apiClientBodyType')}
                value={draft.bodyType}
                onChange={onBodyTypeChange}
            />

            {isNone && (
                <Typography color={TypographyColors.HINT} size={TypographySizes.SMALL}>
                    {t('apiClientBodyNoneHint')}
                </Typography>
            )}

            {isJson && (
                <CodeEditor
                    label={t('apiClientBodyEditor')}
                    language={CodeLanguages.JSON}
                    value={draft.jsonBody}
                    isWithTemplates
                    onChange={onJsonBodyChange}
                />
            )}

            {isRaw && (
                <Field hint={t('apiClientContentTypeHint')} label={t('apiClientContentType')}>
                    <input spellCheck={false} value={draft.rawContentType} onChange={onRawContentTypeChange} />
                </Field>
            )}

            {isRaw && (
                <CodeEditor
                    label={t('apiClientBodyEditor')}
                    language={CodeLanguages.TEXT}
                    value={draft.rawBody}
                    isWithTemplates
                    onChange={onRawBodyChange}
                />
            )}

            {isForm && (
                <KeyValueTable
                    labels={FORM_FIELD_LABELS}
                    rows={draft.formFields}
                    isWithTemplates
                    onRowsChange={onFormFieldsChange}
                />
            )}
        </Flex>
    );
};
