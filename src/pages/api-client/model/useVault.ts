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
import { useProcessAction } from '#shared/ui';

const NO_VAULT: Vault = {};

const NO_STATUS: VaultStatus = {};

export const useVault = () => {
    const { isFailed: isActionFailed, processAction } = useProcessAction();

    const vault = useStorageItem(vaultItem);
    const status = useStorageItem(vaultStatusItem);

    const isLoading = !vault || !status;
    const vaultState = getVaultState(vault ?? NO_VAULT, status ?? NO_STATUS);

    const onVaultLock = () => processAction(executeRpc(vaultRpc.lock, null));

    const onVaultReset = () => processAction(executeRpc(vaultRpc.reset, null));

    return {
        vaultState,
        isLoading,
        isActionFailed,
        onVaultLock,
        onVaultReset,
    };
};
