import type { FC } from 'react';

import type { TabLocation } from '../../model/collectionTabs.ts';

import { useTranslation } from '#shared/i18n';
import { Button, ButtonSizes, Icon, IconNames } from '#shared/ui';

import styles from './RequestToolbar.module.css';

interface RequestToolbarProps {
    /** The collection and the name the request has there; none for a request kept nowhere */
    location: NotRequired<TabLocation>;
    /** Saves the request to its collection, or asks where to save it */
    onSave: VoidFunction;
    /** Opens the request as a cURL command */
    onCurlExport: VoidFunction;
}

export const RequestToolbar: FC<RequestToolbarProps> = ({ location, onSave, onCurlExport }) => {
    const { t } = useTranslation();

    return (
        <div className={styles.toolbar}>
            {location && (
                <p className={styles.location}>
                    <span className={styles.collection}>{location.collectionName}</span>
                    <span aria-hidden='true' className={styles.separator}>
                        /
                    </span>
                    <span className={styles.request}>{location.requestName}</span>
                </p>
            )}

            {!location && <p className={styles.unsaved}>{t('apiClientRequestUnsaved')}</p>}

            <div className={styles.actions}>
                <Button
                    aria-keyshortcuts='Control+S'
                    aria-label={t('apiClientSave')}
                    size={ButtonSizes.SMALL}
                    title={t('apiClientSaveHint')}
                    onClick={onSave}
                >
                    <Icon name={IconNames.SAVE} />
                    {t('apiClientSaveShort')}
                </Button>

                <Button
                    aria-label={t('apiClientCurlExportOpen')}
                    size={ButtonSizes.SMALL}
                    title={t('apiClientCurlExportOpen')}
                    onClick={onCurlExport}
                >
                    <Icon name={IconNames.COPY} />
                    {t('apiClientCurlShort')}
                </Button>
            </div>
        </div>
    );
};
