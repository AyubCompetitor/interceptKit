import type { FC } from 'react';

import { useSiteForm } from '../../model/useSiteForm.ts';

import { useTranslation } from '#shared/i18n';
import { Button, ButtonVariants, Checkbox, Field, Typography, TypographyColors } from '#shared/ui';

import styles from './SiteForm.module.css';

export const SiteForm: FC = () => {
    const { t } = useTranslation();
    const { domain, errorKey, isWithSubdomains, onDomainChange, onSubdomainsChange, onSiteAdd } = useSiteForm();

    return (
        <form className={styles.form} onSubmit={onSiteAdd}>
            <div className={styles.fields}>
                <Field className={styles.domain} label={t('sitesDomain')}>
                    <input
                        placeholder={t('sitesDomainPlaceholder')}
                        spellCheck={false}
                        value={domain}
                        onChange={onDomainChange}
                    />
                </Field>

                <Button type='submit' variant={ButtonVariants.PRIMARY}>
                    {t('sitesAllow')}
                </Button>
            </div>

            <Checkbox checked={isWithSubdomains} label={t('sitesSubdomains')} onChange={onSubdomainsChange} />

            {errorKey && (
                <Typography color={TypographyColors.DANGER} role='alert'>
                    {t(errorKey)}
                </Typography>
            )}
        </form>
    );
};
