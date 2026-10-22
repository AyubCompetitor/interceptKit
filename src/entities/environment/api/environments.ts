import { environmentsValidator, environmentValidator, type Environment } from '../model/environment.ts';

import { defineMethod, defineStoreItem, identifier, object, optional, Stores } from '#shared/lib';

export interface EnvironmentIdParams {
    /** Id of the environment */
    readonly id: string;
}

/** Which environment the API client fills the {{variables}} of requests from */
export interface EnvironmentChoice {
    /** Id of the chosen environment; none means requests go without variables */
    readonly activeId?: string;
}

const environmentChoice = object({ activeId: optional(identifier) });

export const environmentsItem = defineStoreItem<readonly Environment[]>({
    key: 'environments',
    area: Stores.LOCAL,
    fallback: [],
    validator: environmentsValidator,
});

/** Kept apart from the settings, so switching the environment wakes no rule or mock sync */
export const environmentChoiceItem = defineStoreItem<EnvironmentChoice>({
    key: 'environmentChoice',
    area: Stores.LOCAL,
    fallback: {},
    validator: environmentChoice,
});

/** Environments are written only by the background, like rules and mocks */
export const environmentsRpc = {
    save: defineMethod<Environment, Environment>('environments/save', environmentValidator),
    remove: defineMethod<EnvironmentIdParams, void>('environments/remove', object({ id: identifier })),
    choose: defineMethod<EnvironmentChoice, EnvironmentChoice>('environments/choose', environmentChoice),
} as const;
