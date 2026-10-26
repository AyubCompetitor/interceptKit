import { joinClassNames } from '../joinClassNames.ts';

import styles from './Badge.module.css';
import { BadgeTones, type BadgeTone } from './types.ts';

interface BadgeProps {
    /** A neutral label, a state that is on, or something that needs attention */
    tone?: BadgeTone;
}

const TONE_CLASSES: Record<BadgeTone, NotRequired<string>> = {
    [BadgeTones.NEUTRAL]: undefined,
    [BadgeTones.ACCENT]: styles.accent,
    [BadgeTones.WARNING]: styles.warning,
};

export const Badge: FCC<BadgeProps> = ({ tone = BadgeTones.NEUTRAL, children }) => (
    <span className={joinClassNames(styles.badge, TONE_CLASSES[tone])}>{children}</span>
);
