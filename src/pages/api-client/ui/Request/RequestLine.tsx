import type { FC } from 'react';

import { useRequestDraftFields } from '../../lib/useRequestDraftFields.ts';
import type { RequestDraftFields } from '../../model/requestDraft.ts';

import { SENDABLE_METHODS } from '#entities/request';
import { useTranslation } from '#shared/i18n';
import { Button, ButtonVariants, Icon, IconNames } from '#shared/ui';

import styles from './RequestLine.module.css';

interface RequestLineProps extends RequestDraftFields {
    /** Whether the request is on the way */
    isSending: boolean;
    /** Stops the request on the way */
    onCancel: VoidFunction;
    /** Opens the request as a cURL command */
    onCurlExport: VoidFunction;
    /** Saves the request to its collection, or asks where to save it */
    onSave: VoidFunction;
}

const URL_PLACEHOLDER = 'https://api.example.com/users';

export const RequestLine: FC<RequestLineProps> = ({
    draft,
    isSending,
    onDraftChange,
    onCancel,
    onCurlExport,
    onSave,
}) => {
    const { t } = useTranslation();
    const { onMethodChange, onUrlChange } = useRequestDraftFields(draft, onDraftChange);

    return (
        <div className={styles.line}>
            <select
                aria-label={t('apiClientMethod')}
                className={styles.method}
                value={draft.method}
                onChange={onMethodChange}
            >
                {SENDABLE_METHODS.map(method => (
                    <option key={method} value={method}>
                        {method}
                    </option>
                ))}
            </select>

            <input
                aria-label={t('apiClientUrl')}
                className={styles.url}
                inputMode='url'
                placeholder={URL_PLACEHOLDER}
                spellCheck={false}
                type='text'
                value={draft.url}
                required
                onChange={onUrlChange}
            />

            {!isSending && (
                <Button type='submit' variant={ButtonVariants.PRIMARY}>
                    {t('apiClientSend')}
                </Button>
            )}

            {isSending && <Button onClick={onCancel}>{t('apiClientCancel')}</Button>}

            <Button
                aria-label={t('apiClientSave')}
                aria-keyshortcuts='Control+S'
                title={t('apiClientSaveHint')}
                variant={ButtonVariants.GHOST}
                isIconOnly
                onClick={onSave}
            >
                <Icon name={IconNames.SAVE} />
            </Button>

            <Button
                aria-label={t('apiClientCurlExportOpen')}
                title={t('apiClientCurlExportOpen')}
                variant={ButtonVariants.GHOST}
                isIconOnly
                onClick={onCurlExport}
            >
                <Icon name={IconNames.COPY} />
            </Button>
        </div>
    );
};
