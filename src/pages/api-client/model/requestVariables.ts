import {
    fillVariables,
    getEncryptedNames,
    getMissingVariables,
    getTypedSecretNames,
    getUsedVariables,
    getVariableValues,
    type Environment,
    type VariableValues,
} from '#entities/environment';
import { getRequestTexts, mapRequestTexts, type ApiRequest } from '#entities/request';

/** A request ready to go, or the variables that stop it */
export interface ResolvedRequest {
    /** The request with every known {{variable}} filled in */
    readonly request: ApiRequest;
    /** Variables the request uses that have no value */
    readonly missingNames: readonly string[];
    /** Encrypted variables the request uses: only the unlocked vault gives their values */
    readonly secretNames: readonly string[];
}

/** Secrets stored as typed that the request uses: a policy that requires the vault keeps them out */
export const getBlockedSecretNames = (
    request: ApiRequest,
    environment: NotRequired<Environment>,
    isVaultRequired: boolean,
): string[] => {
    if (!isVaultRequired) {
        return [];
    }

    const typedSecretNames = getTypedSecretNames(environment);

    return getUsedVariables(getRequestTexts(request)).filter(name => typedSecretNames.includes(name));
};

export const resolveRequestVariables = (
    request: ApiRequest,
    environment: NotRequired<Environment>,
    secrets: VariableValues,
): ResolvedRequest => {
    const values = getVariableValues(environment, secrets);
    const texts = getRequestTexts(request);
    const encryptedNames = getEncryptedNames(environment);

    return {
        request: mapRequestTexts(request, text => fillVariables(text, values)),
        missingNames: getMissingVariables(texts, values),
        secretNames: getUsedVariables(texts).filter(name => encryptedNames.includes(name)),
    };
};
