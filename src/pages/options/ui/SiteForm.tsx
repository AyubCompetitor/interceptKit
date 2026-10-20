import type { FC } from 'react';

import { useSiteForm } from '../model/useSiteForm.ts';

import { useTranslation } from '#shared/i18n';
import { Button, ButtonVariants, Checkbox, Field, Flex, Spaces, Typography, TypographyColors } from '#shared/ui';

import styles from './SiteForm.module.css';

export const SiteForm: FC = () => {
    const { t } = useTranslation();
    const { domain, errorKey, isWithSubdomains, onDomainChange, onSubdomainsChange, onSiteAdd } = useSiteForm();

    return (
        <form className={styles.form} onSubmit={onSiteAdd}>
            <Flex align='end' gap={Spaces.M} isWrapped>
                <Field label={t('sitesDomain')}>
                    <input placeholder={t('sitesDomainPlaceholder')} value={domain} onChange={onDomainChange} />
                </Field>

                <Checkbox checked={isWithSubdomains} label={t('sitesSubdomains')} onChange={onSubdomainsChange} />

                <Button type='submit' variant={ButtonVariants.PRIMARY}>
                    {t('sitesAllow')}
                </Button>
            </Flex>

            {errorKey && (
                <Typography color={TypographyColors.DANGER} role='alert'>
                    {t(errorKey)}
                </Typography>
            )}
        </form>
    );
};
