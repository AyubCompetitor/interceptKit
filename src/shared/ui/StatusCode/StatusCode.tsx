import type { FC } from 'react';

import { joinClassNames } from '../joinClassNames.ts';

import styles from './StatusCode.module.css';

interface StatusCodeProps {
    /** HTTP status of a response */
    status: number;
    /** What to write; the status alone without it */
    text?: string;
}

/** Hundreds of statuses, from 2xx to 5xx; anything else stays neutral */
const STATUS_TONES = new Map<number, NotRequired<string>>([
    [2, styles.success],
    [3, styles.redirect],
    [4, styles.clientError],
    [5, styles.serverError],
]);

export const StatusCode: FC<StatusCodeProps> = ({ status, text }) => (
    <span className={joinClassNames(styles.status, STATUS_TONES.get(Math.floor(status / 100)))}>{text ?? status}</span>
);
