import type { FC } from 'react';

import type { MissingAccess } from '../../model/siteAccess.ts';

import { useTranslation } from '#shared/i18n';
import { Button, ButtonSizes, Notice, NoticeTones } from '#shared/ui';

interface RuleAccessNoticeProps {
    /** The host the rule cannot reach yet */
    access: MissingAccess;
    /** Asks the browser for access by a host pattern */
    onAccessRequest: (pattern: string) => void;
}

export const RuleAccessNotice: FC<RuleAccessNoticeProps> = ({ access, onAccessRequest }) => {
    const { t } = useTranslation();
    const { host, pattern } = access;

    if (pattern === undefined) {
        return <Notice tone={NoticeTones.WARNING}>{t('ruleHostNotAllowed', host)}</Notice>;
    }

    return (
        <Notice
            action={
                <Button size={ButtonSizes.SMALL} onClick={() => onAccessRequest(pattern)}>
                    {t('ruleAllowAccess')}
                </Button>
            }
            tone={NoticeTones.WARNING}
        >
            {t('ruleNoAccess', host)}
        </Notice>
    );
};
