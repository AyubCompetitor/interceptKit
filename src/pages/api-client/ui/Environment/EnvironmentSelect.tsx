import type { FC } from 'react';

import { NO_ENVIRONMENT, useEnvironmentSelect } from '../../lib/useEnvironmentSelect.ts';
import { useEnvironments } from '../../model/useEnvironments.ts';

import { useTranslation } from '#shared/i18n';

import styles from './EnvironmentSelect.module.css';

/** Which environment fills the {{variables}} of the requests */
export const EnvironmentSelect: FC = () => {
    const { t } = useTranslation();
    const { environments, activeEnvironment, isLoading, onEnvironmentChoose } = useEnvironments();
    const { onChoiceChange } = useEnvironmentSelect(onEnvironmentChoose);

    if (isLoading) {
        return null;
    }

    return (
        <select
            aria-label={t('apiClientEnvironment')}
            className={styles.select}
            value={activeEnvironment?.id ?? NO_ENVIRONMENT}
            onChange={onChoiceChange}
        >
            <option value={NO_ENVIRONMENT}>{t('apiClientNoEnvironment')}</option>
            {environments.map(environment => (
                <option key={environment.id} value={environment.id}>
                    {environment.name}
                </option>
            ))}
        </select>
    );
};
