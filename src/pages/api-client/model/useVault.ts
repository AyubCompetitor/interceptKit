import { useState } from 'react';

import {
    getVaultState,
    vaultItem,
    vaultRpc,
    vaultStatusItem,
    type Vault,
    type VaultStatus,
} from '#entities/environment';
import { executeRpc } from '#shared/messaging';
import { useStorageItem } from '#shared/platform';

const NO_VAULT: Vault = {};

const NO_STATUS: VaultStatus = {};

export const useVault = () => {
    const [isActionFailed, setIsActionFailed] = useState(false);

    const vault = useStorageItem(vaultItem);
    const status = useStorageItem(vaultStatusItem);

    const isLoading = !vault || !status;
    const vaultState = getVaultState(vault ?? NO_VAULT, status ?? NO_STATUS);

    const onVaultLock = () => {
        executeRpc(vaultRpc.lock, null)
            .then(() => setIsActionFailed(false))
            .catch(() => setIsActionFailed(true));
    };

    const onVaultReset = () => {
        executeRpc(vaultRpc.reset, null)
            .then(() => setIsActionFailed(false))
            .catch(() => setIsActionFailed(true));
    };

    return {
        vaultState,
        isLoading,
        isActionFailed,
        onVaultLock,
        onVaultReset,
    };
};
