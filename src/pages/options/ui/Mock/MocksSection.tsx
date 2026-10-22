import { useId, type FC } from 'react';

import { buildSectionHash, DashboardSections } from '../../lib/dashboard.ts';
import { useMockDeletion } from '../../lib/useMockDeletion.ts';
import { useMockEditor } from '../../lib/useMockEditor.ts';
import { useMockList } from '../../model/useMockList.ts';

import { useInterceptionSwitch } from '#features/interception-switch';
import { useTranslation } from '#shared/i18n';
import {
    Button,
    ButtonSizes,
    ButtonVariants,
    EmptyState,
    Flex,
    Icon,
    IconNames,
    Notice,
    NoticeTones,
    Spaces,
    Typography,
    TypographyColors,
} from '#shared/ui';

import { DeleteMockModal } from './DeleteMockModal.tsx';
import { MockEditor } from './MockEditor.tsx';
import { MockRow } from './MockRow.tsx';
import styles from './MocksSection.module.css';
import { SectionHeader } from '../SectionHeader/SectionHeader.tsx';

const SITES_HASH = buildSectionHash(DashboardSections.SITES);

export const MocksSection: FC = () => {
    const titleId = useId();

    const { t } = useTranslation();
    const { mocks, mockPatterns, isLoading, isActionFailed, onMockToggle, onMockDelete } = useMockList();
    const { isEnabled, isSaveFailed, onInterceptionEnable } = useInterceptionSwitch();
    const { mockToDelete, onDeleteRequest, onDeleteCancel, onDeleteConfirm } = useMockDeletion(onMockDelete);
    const { editedMock, isEditorOpen, onMockCreate, onMockEdit, onEditorClose } = useMockEditor();

    if (isLoading) {
        return null;
    }

    const hasMocks = mocks.length > 0;
    const hasMockSites = mockPatterns.length > 0;

    const newMockButton = (
        <Button variant={ButtonVariants.PRIMARY} onClick={onMockCreate}>
            <Icon name={IconNames.PLUS} />
            {t('mocksAdd')}
        </Button>
    );

    return (
        <Flex aria-labelledby={titleId} as='section' direction='column' gap={Spaces.XL}>
            <SectionHeader
                action={hasMocks && newMockButton}
                description={t('mocksDescription')}
                title={t('mocksTitle')}
                titleId={titleId}
            />

            {!isEnabled && (
                <Notice
                    action={
                        <Button size={ButtonSizes.SMALL} onClick={onInterceptionEnable}>
                            {t('interceptionTurnOn')}
                        </Button>
                    }
                    tone={NoticeTones.WARNING}
                >
                    {t('mocksPaused')}
                </Notice>
            )}

            {!hasMockSites && (
                <Notice
                    action={
                        <a className={styles.noticeLink} href={SITES_HASH}>
                            {t('mocksOpenSites')}
                        </a>
                    }
                >
                    {t('mocksNoSites')}
                </Notice>
            )}

            <Notice tone={NoticeTones.WARNING}>{t('mocksSecretsWarning')}</Notice>

            {hasMocks && (
                <ul className={styles.list}>
                    {mocks.map(mock => (
                        <MockRow
                            key={mock.id}
                            mock={mock}
                            onDelete={onDeleteRequest}
                            onEdit={onMockEdit}
                            onToggle={onMockToggle}
                        />
                    ))}
                </ul>
            )}

            {!hasMocks && (
                <EmptyState
                    action={newMockButton}
                    description={t('mocksEmptyText')}
                    icon={IconNames.MOCKS}
                    title={t('mocksEmptyTitle')}
                />
            )}

            {isActionFailed && (
                <Typography color={TypographyColors.DANGER} role='alert'>
                    {t('mocksActionFailed')}
                </Typography>
            )}

            {isSaveFailed && (
                <Typography color={TypographyColors.DANGER} role='alert'>
                    {t('interceptionSaveFailed')}
                </Typography>
            )}

            <MockEditor isOpen={isEditorOpen} mock={editedMock} onClose={onEditorClose} />

            <DeleteMockModal mock={mockToDelete} onCancel={onDeleteCancel} onConfirm={onDeleteConfirm} />
        </Flex>
    );
};
