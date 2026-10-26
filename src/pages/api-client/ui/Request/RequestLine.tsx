import type { FC } from 'react';

import { useRequestDraftFields } from '../../lib/useRequestDraftFields.ts';
import type { RequestDraftFields } from '../../model/requestDraft.ts';

import { SENDABLE_METHODS } from '#entities/request';
import { useTranslation } from '#shared/i18n';
import { Button, ButtonVariants, getMethodToneClass, joinClassNames, TemplateInput } from '#shared/ui';

import styles from './RequestLine.module.css';

interface RequestLineProps extends RequestDraftFields {
    /** Whether the request is on the way */
    isSending: boolean;
    /** Stops the request on the way */
    onCancel: VoidFunction;
}

const URL_PLACEHOLDER = 'https://api.example.com/users';

export const RequestLine: FC<RequestLineProps> = ({ draft, isSending, onDraftChange, onCancel }) => {
    const { t } = useTranslation();
    const { onMethodChange, onUrlChange } = useRequestDraftFields(draft, onDraftChange);

    return (
        <div className={styles.line}>
            <select
                aria-label={t('apiClientMethod')}
                className={joinClassNames(styles.method, getMethodToneClass(draft.method))}
                value={draft.method}
                onChange={onMethodChange}
            >
                {SENDABLE_METHODS.map(method => (
                    <option key={method} className={getMethodToneClass(method)} value={method}>
                        {method}
                    </option>
                ))}
            </select>

            <TemplateInput
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
        </div>
    );
};
