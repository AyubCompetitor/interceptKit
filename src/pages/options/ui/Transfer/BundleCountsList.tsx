import type { FC } from 'react';

import { BUNDLE_PARTS, type BundleCounts } from '#features/transfer';
import { useTranslation } from '#shared/i18n';

import styles from './BundleCountsList.module.css';
import { BUNDLE_PART_LABELS } from './transferLabels.ts';

interface BundleCountsListProps {
    /** What an import does, or did, to each list */
    counts: BundleCounts;
}

export const BundleCountsList: FC<BundleCountsListProps> = ({ counts }) => {
    const { t } = useTranslation();

    return (
        <ul className={styles.list}>
            {BUNDLE_PARTS.map(part => (
                <li key={part}>
                    {t(
                        'transferCounts',
                        t(BUNDLE_PART_LABELS[part]),
                        String(counts[part].added),
                        String(counts[part].replaced),
                        String(counts[part].skipped),
                    )}
                </li>
            ))}
        </ul>
    );
};
