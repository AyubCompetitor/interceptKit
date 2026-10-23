import { useState } from 'react';

export enum VaultDialogs {
    SETUP = 'setup',
    UNLOCK = 'unlock',
    DISABLE = 'disable',
    RESET = 'reset',
}

export type VaultDialog = `${VaultDialogs}`;

/** Keeps the dialog that was opened, even when the state of the vault changes under it */
export const useVaultDialog = () => {
    const [dialog, setDialog] = useState<NotRequired<VaultDialog>>();

    /** A dialog closes a moment after the next one opens, and that must not close the next one */
    const closeDialog = (closedDialog: VaultDialog) => {
        setDialog(current => {
            if (current !== closedDialog) {
                return current;
            }

            return;
        });
    };

    const onSetupOpen = () => setDialog(VaultDialogs.SETUP);

    const onUnlockOpen = () => setDialog(VaultDialogs.UNLOCK);

    const onDisableOpen = () => setDialog(VaultDialogs.DISABLE);

    const onResetOpen = () => setDialog(VaultDialogs.RESET);

    const onSetupClose = () => closeDialog(VaultDialogs.SETUP);

    const onUnlockClose = () => closeDialog(VaultDialogs.UNLOCK);

    const onDisableClose = () => closeDialog(VaultDialogs.DISABLE);

    const onResetClose = () => closeDialog(VaultDialogs.RESET);

    return {
        dialog,
        onSetupOpen,
        onUnlockOpen,
        onDisableOpen,
        onResetOpen,
        onSetupClose,
        onUnlockClose,
        onDisableClose,
        onResetClose,
    };
};
