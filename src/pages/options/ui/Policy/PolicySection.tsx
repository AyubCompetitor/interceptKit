import { useId, type FC } from 'react';

import { usePolicy } from '#features/policy';
import { readPresetBundle } from '#features/transfer';
import { useTranslation } from '#shared/i18n';
import { EmptyState, Flex, IconNames, Spaces, Typography, TypographyColors } from '#shared/ui';

import styles from './PolicySection.module.css';
import { getPolicyRows } from './policySummary.ts';
import { SectionHeader } from '../SectionHeader/SectionHeader.tsx';

const MAX_SHOWN_ISSUES = 10;

export const PolicySection: FC = () => {
    const titleId = useId();
    const valuesTitleId = useId();

    const { t } = useTranslation();
    const { policy, issues: policyIssues, isLoading } = usePolicy();

    if (isLoading) {
        return null;
    }

    const preset = readPresetBundle(policy.presetBundle);
    const issues = [...policyIssues, ...preset.issues];
    const isPolicySet = !!Object.keys(policy).length || !!issues.length;

    return (
        <Flex aria-labelledby={titleId} as='section' direction='column' gap={Spaces.XL}>
            <SectionHeader description={t('policyDescription')} title={t('policyTitle')} titleId={titleId} />

            {!isPolicySet && (
                <EmptyState description={t('policyEmptyText')} icon={IconNames.POLICY} title={t('policyEmptyTitle')} />
            )}

            {!!issues.length && (
                <Flex direction='column' gap={Spaces.XS}>
                    <Typography color={TypographyColors.DANGER}>{t('policyIssues')}</Typography>

                    <ul className={styles.issues}>
                        {issues.slice(0, MAX_SHOWN_ISSUES).map(issue => (
                            <li key={`${issue.path}:${issue.message}`}>{`${issue.path}: ${issue.message}`}</li>
                        ))}
                    </ul>
                </Flex>
            )}

            {isPolicySet && (
                <Flex
                    aria-labelledby={valuesTitleId}
                    as='section'
                    className={styles.card}
                    direction='column'
                    gap={Spaces.L}
                >
                    <h2 id={valuesTitleId}>{t('policyValuesTitle')}</h2>

                    <dl className={styles.values}>
                        {getPolicyRows({ policy, preset }, t).map(row => (
                            <div key={row.label} className={styles.row}>
                                <dt className={styles.term}>{t(row.label)}</dt>
                                <dd className={styles.value}>{row.value}</dd>
                            </div>
                        ))}
                    </dl>
                </Flex>
            )}
        </Flex>
    );
};
