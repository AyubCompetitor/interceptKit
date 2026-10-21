import type { FC, ReactNode } from 'react';

import { Icon, type IconName } from '../Icon/index.ts';

import styles from './EmptyState.module.css';

interface EmptyStateProps {
    /** Picture of what is missing */
    icon: IconName;
    /** What is missing */
    title: string;
    /** What the user can do about it */
    description: string;
    /** The first step, usually a button */
    action?: ReactNode;
}

export const EmptyState: FC<EmptyStateProps> = ({ icon, title, description, action }) => (
    <div className={styles.emptyState}>
        <span className={styles.icon}>
            <Icon name={icon} />
        </span>

        <p className={styles.title}>{title}</p>

        <p className={styles.description}>{description}</p>

        {action}
    </div>
);
