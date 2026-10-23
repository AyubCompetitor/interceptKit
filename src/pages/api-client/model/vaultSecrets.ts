import {
    getEncryptedNames,
    vaultRpc,
    type Environment,
    type SecretValue,
    type VariableValues,
} from '#entities/environment';
import { executeRpc } from '#shared/messaging';

export const NO_SECRETS: VariableValues = new Map();

const mapSecretToEntry = ({ key, value }: SecretValue): [string, string] => [key, value];

const loadSecrets = async (environment: NotRequired<Environment>, isUnlocked: boolean): Promise<VariableValues> => {
    const isEncryptedUsed = getEncryptedNames(environment).length > 0;

    if (!environment || !isUnlocked || !isEncryptedUsed) {
        return NO_SECRETS;
    }

    const { secrets } = await executeRpc(vaultRpc.reveal, { id: environment.id });

    return new Map(secrets.map(mapSecretToEntry));
};

/** Calls listener once with the secrets the environment can use; after the returned stop a late answer is dropped */
export const requestSecrets = (
    environment: NotRequired<Environment>,
    isUnlocked: boolean,
    listener: (secrets: VariableValues) => void,
): VoidFunction => {
    let isWaiting = true;

    const updateSecrets = (secrets: VariableValues) => {
        if (!isWaiting) {
            return;
        }

        listener(secrets);
    };

    loadSecrets(environment, isUnlocked)
        .then(updateSecrets)
        .catch(() => updateSecrets(NO_SECRETS));

    return () => {
        isWaiting = false;
    };
};
