import type { Environment } from './environment.ts';

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
