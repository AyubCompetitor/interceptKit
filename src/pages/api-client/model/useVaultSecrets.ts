import { useEffect, useState } from 'react';

import { VaultStates, type Environment, type VariableValues } from '#entities/environment';

import { useVault } from './useVault.ts';
import { NO_SECRETS, subscribeSecrets } from './vaultSecrets.ts';

/** Decrypted values of the environment, held only while the vault is unlocked */
export const useVaultSecrets = (environment: NotRequired<Environment>) => {
    const [secrets, setSecrets] = useState<VariableValues>(NO_SECRETS);

    const { vaultState } = useVault();

    const isUnlocked = vaultState === VaultStates.UNLOCKED;

    useEffect(() => subscribeSecrets(environment, isUnlocked, setSecrets), [environment, isUnlocked]);

    return secrets;
};
