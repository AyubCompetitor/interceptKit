import { isEncryptedValue, type Environment, type EnvVariable, type VariableValues } from '#entities/environment';
import { buildCurlCommand, type ApiRequest } from '#entities/request';

import { resolveRequestVariables } from './requestVariables.ts';
import { NO_SECRETS } from './vaultSecrets.ts';

/** How the command fills in variables */
export interface CurlExportOptions {
    /** Whether the values of secrets go into the command */
    readonly isWithSecrets: boolean;
    /** The policy keeps secrets stored as typed out of requests */
    readonly isVaultRequired: boolean;
}

/** A command ready to copy */
export interface CurlExport {
    /** The bash command */
    readonly command: string;
    /** Variables the command still has as {{name}} */
    readonly missingNames: readonly string[];
}

/** A secret goes only when asked for, and a typed one never when the policy requires the vault */
const isVariableExported = (variable: EnvVariable, options: CurlExportOptions): boolean => {
    const isBlockedTypedSecret = options.isVaultRequired && !isEncryptedValue(variable.value);

    return !variable.secret || (options.isWithSecrets && !isBlockedTypedSecret);
};

const getExportedEnvironment = (
    environment: NotRequired<Environment>,
    options: CurlExportOptions,
): NotRequired<Environment> => {
    if (!environment) {
        return;
    }

    return {
        ...environment,
        variables: environment.variables.filter(variable => isVariableExported(variable, options)),
    };
};

export const buildCurlExport = (
    request: ApiRequest,
    environment: NotRequired<Environment>,
    secrets: VariableValues,
    options: CurlExportOptions,
): CurlExport => {
    const exportedEnvironment = getExportedEnvironment(environment, options);
    const exportedSecrets = options.isWithSecrets ? secrets : NO_SECRETS;

    const resolved = resolveRequestVariables(request, exportedEnvironment, exportedSecrets);

    return {
        command: buildCurlCommand(resolved.request),
        missingNames: resolved.missingNames,
    };
};
