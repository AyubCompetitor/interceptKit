import type { FC } from 'react';

import { Button, ButtonSizes, ButtonVariants } from '../Button/index.ts';
import { Icon, IconNames } from '../Icon/index.ts';

import styles from './Menu.module.css';
import type { MenuAction } from './types.ts';
import { useMenu } from './useMenu.ts';

interface MenuProps {
    /** Accessible name of the button that opens the menu */
    label: string;
    /** Actions in their order */
    actions: readonly MenuAction[];
}

/** A native popover anchored under its button: the browser closes it on Escape and on a click outside */
export const Menu: FC<MenuProps> = ({ label, actions }) => {
    const { menuId, menuRef, anchorStyle, onActionSelect } = useMenu();

    return (
        <span className={styles.menu} style={anchorStyle}>
            <Button
                aria-label={label}
                className={styles.trigger}
                popoverTarget={menuId}
                size={ButtonSizes.SMALL}
                title={label}
                variant={ButtonVariants.GHOST}
                isIconOnly
            >
                <Icon name={IconNames.MORE} />
            </Button>

            <div aria-label={label} className={styles.popover} id={menuId} popover='auto' ref={menuRef} role='group'>
                {actions.map(action => (
                    <button
                        key={action.label}
                        className={styles.action}
                        type='button'
                        onClick={() => onActionSelect(action)}
                    >
                        {action.label}
                    </button>
                ))}
            </div>
        </span>
    );
};
