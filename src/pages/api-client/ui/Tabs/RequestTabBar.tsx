import type { FC } from 'react';

import type { RequestTab } from '../../model/requestTabs.ts';

import { useTranslation } from '#shared/i18n';
import { Button, ButtonSizes, ButtonVariants, Icon, IconNames } from '#shared/ui';

import styles from './RequestTabBar.module.css';
import { RequestTabItem } from './RequestTabItem.tsx';

interface RequestTabBarProps {
    /** Open requests in their order */
    tabs: readonly RequestTab[];
    /** Id of the tab on the screen */
    activeId: string;
    /** Tabs of a collection whose request differs from the one kept there */
    unsavedIds: readonly string[];
    /** Names of the requests that tabs of collections show, by the id of the tab */
    names: ReadonlyMap<string, string>;
    /** Opens a new empty request */
    onOpen: VoidFunction;
    /** Called with the id of the tab to show */
    onSelect: (tabId: string) => void;
    /** Called with the id of the tab to close */
    onClose: (tabId: string) => void;
}

export const RequestTabBar: FC<RequestTabBarProps> = ({
    tabs,
    activeId,
    unsavedIds,
    names,
    onOpen,
    onSelect,
    onClose,
}) => {
    const { t } = useTranslation();

    return (
        <nav aria-label={t('apiClientTabs')} className={styles.bar}>
            <ul className={styles.list}>
                {tabs.map(tab => (
                    <RequestTabItem
                        key={tab.draft.id}
                        isActive={tab.draft.id === activeId}
                        isUnsaved={unsavedIds.includes(tab.draft.id)}
                        name={names.get(tab.draft.id)}
                        tab={tab}
                        onClose={onClose}
                        onSelect={onSelect}
                    />
                ))}
            </ul>

            <Button
                aria-label={t('apiClientTabOpen')}
                size={ButtonSizes.SMALL}
                title={t('apiClientTabOpen')}
                variant={ButtonVariants.GHOST}
                isIconOnly
                onClick={onOpen}
            >
                <Icon name={IconNames.PLUS} />
            </Button>
        </nav>
    );
};
