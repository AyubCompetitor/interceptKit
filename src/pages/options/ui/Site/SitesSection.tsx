import { useId, type FC } from 'react';

import { buildSectionHash, DashboardSections } from '../../lib/dashboard.ts';

import { usePolicy } from '#features/policy';
import { useTranslation } from '#shared/i18n';
import { Flex, Notice, NoticeTones, Spaces } from '#shared/ui';

import { SectionHeader } from '../SectionHeader/SectionHeader.tsx';
import { SiteForm } from './SiteForm.tsx';
import { SiteList } from './SiteList.tsx';
import styles from './SitesSection.module.css';

const POLICY_HASH = buildSectionHash(DashboardSections.POLICY);

const HOST_SEPARATOR = ', ';

export const SitesSection: FC = () => {
    const titleId = useId();

    const { t } = useTranslation();
    const { policy } = usePolicy();

    const { allowedHosts } = policy;

    return (
        <Flex aria-labelledby={titleId} as='section' direction='column' gap={Spaces.XL}>
            <SectionHeader description={t('sitesDescription')} title={t('sitesTitle')} titleId={titleId} />

            {allowedHosts && (
                <Notice
                    action={
                        <a className={styles.noticeLink} href={POLICY_HASH}>
                            {t('policyOpen')}
                        </a>
                    }
                    tone={NoticeTones.WARNING}
                >
                    {allowedHosts.length
                        ? t('sitesAllowedHosts', allowedHosts.join(HOST_SEPARATOR))
                        : t('sitesNoHostsAllowed')}
                </Notice>
            )}

            <SiteForm />

            <SiteList />
        </Flex>
    );
};
