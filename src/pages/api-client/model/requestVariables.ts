import {
    fillVariables,
    getEncryptedNames,
    getMissingVariables,
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
