import { fillVariables, getMissingVariables, getVariableValues, type Environment } from '#entities/environment';
import { getRequestTexts, mapRequestTexts, type ApiRequest } from '#entities/request';

/** A request ready to go, or the variables that stop it */
export interface ResolvedRequest {
    /** The request with every known {{variable}} filled in */
    readonly request: ApiRequest;
    /** Variables the request uses that have no value */
    readonly missingNames: readonly string[];
}

/** The request as typed stays untouched: history keeps templates, never the values of secrets */
export const resolveRequestVariables = (
    request: ApiRequest,
    environment: NotRequired<Environment>,
): ResolvedRequest => {
    const values = getVariableValues(environment);

    return {
        request: mapRequestTexts(request, text => fillVariables(text, values)),
        missingNames: getMissingVariables(getRequestTexts(request), values),
    };
};
