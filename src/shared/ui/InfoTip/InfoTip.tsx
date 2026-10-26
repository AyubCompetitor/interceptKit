import { Icon, IconNames } from '../Icon/index.ts';
import { usePopoverAnchor } from '../usePopoverAnchor.ts';

import styles from './InfoTip.module.css';

interface InfoTipProps {
    /** Name of the button and of the card it opens */
    label: string;
}

/** An info button that opens a card next to it; the browser closes the card on Escape and on a click outside */
export const InfoTip: FCC<InfoTipProps> = ({ label, children }) => {
    const { popoverId, anchorStyle } = usePopoverAnchor();

    return (
        <span className={styles.tip} style={anchorStyle}>
            <button aria-label={label} className={styles.trigger} popoverTarget={popoverId} title={label} type='button'>
                <Icon name={IconNames.INFO} />
            </button>

            <div aria-label={label} className={styles.card} id={popoverId} popover='auto' role='dialog'>
                {children}
            </div>
        </span>
    );
};
