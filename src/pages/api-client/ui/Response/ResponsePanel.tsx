import { useId, type FC } from 'react';

import type { SendState } from '../../model/sendState.ts';

import { useTranslation } from '#shared/i18n';

import { ResponseContent } from './ResponseContent.tsx';
import styles from './ResponsePanel.module.css';

interface ResponsePanelProps {
    /** Where the request of the tab stands */
    sendState: SendState;
    /** Asks for access to the host and sends the request again */
    onAccessRequest: VoidFunction;
}

export const ResponsePanel: FC<ResponsePanelProps> = ({ sendState, onAccessRequest }) => {
    const titleId = useId();

    const { t } = useTranslation();

    return (
        <section aria-labelledby={titleId} className={styles.panel}>
            <h2 className={styles.title} id={titleId}>
                {t('apiClientResponse')}
            </h2>

            <ResponseContent sendState={sendState} onAccessRequest={onAccessRequest} />
        </section>
    );
};
