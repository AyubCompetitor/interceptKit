import type { FC } from 'react';

import { useVaultDialog, VaultDialogs } from '../../lib/useVaultDialog.ts';
import { useVault } from '../../model/useVault.ts';

import { VaultStates } from '#entities/environment';
import { useTranslation } from '#shared/i18n';
import { Button, ButtonVariants, Icon, IconNames, Typography, TypographyColors } from '#shared/ui';

import { ResetVaultModal } from './ResetVaultModal.tsx';
import { VaultDisableModal } from './VaultDisableModal.tsx';
import { VaultSetupModal } from './VaultSetupModal.tsx';
import { VaultUnlockModal } from './VaultUnlockModal.tsx';

export const VaultControl: FC = () => {
    const { t } = useTranslation();
    const { vaultState, isLoading, isActionFailed, onVaultLock, onVaultReset } = useVault();
    const {
        dialog,
        onSetupOpen,
        onUnlockOpen,
        onDisableOpen,
        onResetOpen,
        onSetupClose,
        onUnlockClose,
        onDisableClose,
        onResetClose,
    } = useVaultDialog();

    const onResetConfirm = () => {
        onVaultReset();
        onResetClose();
    };

    if (isLoading) {
        return null;
    }

    return (
        <>
            {vaultState === VaultStates.OFF && (
                <Button onClick={onSetupOpen}>
                    <Icon name={IconNames.LOCK} />
                    {t('apiClientVaultSetupOpen')}
                </Button>
            )}

            {vaultState === VaultStates.LOCKED && (
                <Button onClick={onUnlockOpen}>
                    <Icon name={IconNames.LOCK} />
                    {t('apiClientVaultUnlockOpen')}
                </Button>
            )}

            {vaultState === VaultStates.UNLOCKED && (
                <>
                    <Button onClick={onVaultLock}>
                        <Icon name={IconNames.UNLOCK} />
                        {t('apiClientVaultLock')}
                    </Button>

                    <Button
                        aria-label={t('apiClientVaultDisableOpen')}
                        title={t('apiClientVaultDisableOpen')}
                        variant={ButtonVariants.GHOST}
                        isIconOnly
                        onClick={onDisableOpen}
                    >
                        <Icon name={IconNames.SETTINGS} />
                    </Button>
                </>
            )}

            {isActionFailed && (
                <Typography color={TypographyColors.DANGER} role='alert'>
                    {t('apiClientVaultFailed')}
                </Typography>
            )}

            <VaultSetupModal isOpen={dialog === VaultDialogs.SETUP} onClose={onSetupClose} />

            <VaultUnlockModal isOpen={dialog === VaultDialogs.UNLOCK} onClose={onUnlockClose} onReset={onResetOpen} />

            <VaultDisableModal isOpen={dialog === VaultDialogs.DISABLE} onClose={onDisableClose} />

            <ResetVaultModal
                isOpen={dialog === VaultDialogs.RESET}
                onCancel={onResetClose}
                onConfirm={onResetConfirm}
            />
        </>
    );
};
