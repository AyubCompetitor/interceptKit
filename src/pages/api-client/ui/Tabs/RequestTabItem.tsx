import type { FC } from 'react';

import type { RequestTab } from '../../model/requestTabs.ts';

import { useTranslation } from '#shared/i18n';
import { Button, ButtonSizes, ButtonVariants, Icon, IconNames, joinClassNames } from '#shared/ui';

import { getRequestTabTitle } from './requestTabTitle.ts';
import styles from './RequestTabItem.module.css';

interface RequestTabItemProps {
    /** The open request */
    tab: RequestTab;
    /** Whether the tab is on the screen */
    isActive: boolean;
    /** Whether the request differs from the one its collection keeps */
    isUnsaved: boolean;
    /** Name of its request in a collection; none shows the URL */
    name: NotRequired<string>;
    /** Called with the id of the tab to show */
    onSelect: (tabId: string) => void;
    /** Called with the id of the tab to close */
    onClose: (tabId: string) => void;
}

export const RequestTabItem: FC<RequestTabItemProps> = ({ tab, isActive, isUnsaved, name, onSelect, onClose }) => {
    const { t } = useTranslation();
    const title = name ?? getRequestTabTitle(tab.draft) ?? t('apiClientNewTab');

    const onTabSelect = () => onSelect(tab.draft.id);
    const onTabClose = () => onClose(tab.draft.id);

    return (
        <li className={joinClassNames(styles.item, isActive && styles.isActive)}>
            <button aria-current={isActive} className={styles.select} type='button' onClick={onTabSelect}>
                <span className={styles.method}>{tab.draft.method}</span>
                <span className={styles.title}>{title}</span>

                {isUnsaved && <span aria-label={t('apiClientTabUnsaved')} className={styles.unsaved} role='img' />}
            </button>

            <Button
                aria-label={t('apiClientTabClose', title)}
                size={ButtonSizes.SMALL}
                title={t('apiClientTabClose', title)}
                variant={ButtonVariants.GHOST}
                isIconOnly
                onClick={onTabClose}
            >
                <Icon name={IconNames.CLOSE} />
            </Button>
        </li>
    );
};
