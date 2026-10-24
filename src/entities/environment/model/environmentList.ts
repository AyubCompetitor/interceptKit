import type { Environment, EnvVariable } from './environment.ts';

export const upsertEnvironment = (environments: readonly Environment[], environment: Environment): Environment[] => {
    const index = environments.findIndex(current => current.id === environment.id);

    if (index === -1) {
        return [...environments, environment];
    }

    return environments.with(index, environment);
};

export const removeEnvironment = (environments: readonly Environment[], id: string): Environment[] => {
    return environments.filter(environment => environment.id !== id);
};

/** The environment with the id; none without an id or once it is deleted */
export const findEnvironment = (
    environments: readonly Environment[],
    id: NotRequired<string>,
): NotRequired<Environment> => {
    if (id === undefined) {
        return;
    }

    return environments.find(environment => environment.id === id);
};

const getSecretVariables = (variables: readonly EnvVariable[]): EnvVariable[] =>
    variables.map((variable: EnvVariable) => (variable.secret ? { ...variable, value: '' } : variable));

export const hideSecretValues = (environment: Environment): Environment => ({
    ...environment,
    variables: getSecretVariables(environment.variables),
});

/** An environment holds up to a thousand variables, so the local ones are looked up by name, not searched */
const restoreLocalSecrets = (
    variables: readonly EnvVariable[],
    localVariables: readonly EnvVariable[],
): EnvVariable[] => {
    const localValues = new Map(localVariables.map(variable => [variable.key, variable.value]));

    return variables.map((variable: EnvVariable): EnvVariable => {
        const localValue = localValues.get(variable.key);
        const isEmptySecret = variable.secret && variable.value === '';

        if (!isEmptySecret || localValue === undefined) {
            return variable;
        }

        return {
            ...variable,
            value: localValue,
        };
    });
};

export const mergeImportedEnvironment = (local: Environment, imported: Environment): Environment => ({
    ...imported,
    variables: restoreLocalSecrets(imported.variables, local.variables),
});
