import type { ReactNode } from 'react';

import { Icon, IconNames } from '../Icon/index.ts';
import { joinClassNames } from '../joinClassNames.ts';

import styles from './Notice.module.css';
import { NoticeTones, type NoticeTone } from './types.ts';

interface NoticeProps {
    /** Neutral information or a warning that needs the user's attention */
    tone?: NoticeTone;
    /** A button or link that resolves the notice */
    action?: ReactNode;
}

const TONE_CLASSES: Record<NoticeTone, NotRequired<string>> = {
    [NoticeTones.INFO]: styles.info,
    [NoticeTones.WARNING]: styles.warning,
};

export const Notice: FCC<NoticeProps> = ({ tone = NoticeTones.INFO, action, children }) => {
    const isWarning = tone === NoticeTones.WARNING;

    return (
        <div className={joinClassNames(styles.notice, TONE_CLASSES[tone])}>
            {isWarning && <Icon className={styles.icon} name={IconNames.WARNING} />}

            <p className={styles.text}>{children}</p>

            {action}
        </div>
    );
};
