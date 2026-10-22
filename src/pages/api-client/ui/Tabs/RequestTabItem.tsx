import type { FC } from 'react';

import { useRequestTabItem } from '../../lib/useRequestTabItem.ts';
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
    /** Called with the id of the tab to show */
    onSelect: (tabId: string) => void;
    /** Called with the id of the tab to close */
    onClose: (tabId: string) => void;
}

export const RequestTabItem: FC<RequestTabItemProps> = ({ tab, isActive, onSelect, onClose }) => {
    const { t } = useTranslation();
    const { onTabSelect, onTabClose } = useRequestTabItem(tab.draft.id, onSelect, onClose);

    const title = getRequestTabTitle(tab.draft) ?? t('apiClientNewTab');

    return (
        <li className={joinClassNames(styles.item, isActive && styles.isActive)}>
            <button aria-current={isActive} className={styles.select} type='button' onClick={onTabSelect}>
                <span className={styles.method}>{tab.draft.method}</span>
                <span className={styles.title}>{title}</span>
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
