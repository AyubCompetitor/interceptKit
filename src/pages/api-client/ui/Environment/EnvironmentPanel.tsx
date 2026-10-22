import type { FC } from 'react';

import { useEnvironmentDeletion } from '../../lib/useEnvironmentDeletion.ts';
import { useEnvironmentEditor } from '../../lib/useEnvironmentEditor.ts';
import { useEnvironments } from '../../model/useEnvironments.ts';

import { useTranslation } from '#shared/i18n';
import { Button, ButtonSizes, Icon, IconNames, Typography, TypographyColors, TypographySizes } from '#shared/ui';

import { DeleteEnvironmentModal } from './DeleteEnvironmentModal.tsx';
import { EnvironmentEditor } from './EnvironmentEditor.tsx';
import styles from './EnvironmentPanel.module.css';
import { EnvironmentRow } from './EnvironmentRow.tsx';

/** The environments of the API client; the switch of the sidebar names the panel */
export const EnvironmentPanel: FC = () => {
    const { t } = useTranslation();
    const { environments, activeEnvironment, isLoading, isActionFailed, onEnvironmentDelete } = useEnvironments();
    const { editedEnvironment, isEditorOpen, onEnvironmentCreate, onEnvironmentEdit, onEditorClose } =
        useEnvironmentEditor();
    const { environmentToDelete, onDeleteRequest, onDeleteCancel, onDeleteConfirm } =
        useEnvironmentDeletion(onEnvironmentDelete);

    if (isLoading) {
        return null;
    }

    const hasEnvironments = environments.length > 0;

    return (
        <section aria-label={t('apiClientEnvironments')} className={styles.panel}>
            {hasEnvironments && (
                <ul className={styles.list}>
                    {environments.map(environment => (
                        <EnvironmentRow
                            key={environment.id}
                            environment={environment}
                            isActive={environment.id === activeEnvironment?.id}
                            onDelete={onDeleteRequest}
                            onEdit={onEnvironmentEdit}
                        />
                    ))}
                </ul>
            )}

            {!hasEnvironments && (
                <Typography color={TypographyColors.HINT} size={TypographySizes.SMALL}>
                    {t('apiClientEnvironmentsEmpty')}
                </Typography>
            )}

            <Button size={ButtonSizes.SMALL} onClick={onEnvironmentCreate}>
                <Icon name={IconNames.PLUS} />
                {t('apiClientEnvironmentAdd')}
            </Button>

            {isActionFailed && (
                <Typography color={TypographyColors.DANGER} role='alert'>
                    {t('apiClientEnvironmentsActionFailed')}
                </Typography>
            )}

            <EnvironmentEditor environment={editedEnvironment} isOpen={isEditorOpen} onClose={onEditorClose} />

            <DeleteEnvironmentModal
                environment={environmentToDelete}
                onCancel={onDeleteCancel}
                onConfirm={onDeleteConfirm}
            />
        </section>
    );
};
