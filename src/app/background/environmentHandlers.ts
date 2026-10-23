import {
    environmentChoiceItem,
    environmentsItem,
    environmentsRpc,
    environmentsValidator,
    findEnvironment,
    removeEnvironment,
    upsertEnvironment,
    type Environment,
    type EnvironmentChoice,
    type EnvironmentIdParams,
} from '#entities/environment';
import { formatIssues, validate, type TaskQueue } from '#shared/lib';
import { RpcErrorCodes, throwRpcError, type Router } from '#shared/messaging';
import { readItem, writeItem } from '#shared/platform';

const CHOICE_ERRORS = {
    UNKNOWN_ENVIRONMENT: 'there is no environment with this id',
} as const;

const NO_CHOICE: EnvironmentChoice = {};

const saveEnvironmentHandler = async (environment: Environment, storageReady: Promise<void>): Promise<Environment> => {
    await storageReady;

    const environments = await readItem(environmentsItem);
    const nextEnvironments = upsertEnvironment(environments, environment);

    const listResult = validate(environmentsValidator, nextEnvironments);

    if (!listResult.ok) {
        throwRpcError(RpcErrorCodes.BAD_REQUEST, formatIssues(listResult.issues));
    }

    await writeItem(environmentsItem, nextEnvironments);

    return environment;
};

/** Deleting the chosen environment leaves requests without variables */
const removeEnvironmentHandler = async (params: EnvironmentIdParams, storageReady: Promise<void>): Promise<void> => {
    await storageReady;

    const environments = await readItem(environmentsItem);
    const choice = await readItem(environmentChoiceItem);

    await writeItem(environmentsItem, removeEnvironment(environments, params.id));

    const isChosenRemoved = choice.activeId === params.id;

    if (isChosenRemoved) {
        await writeItem(environmentChoiceItem, NO_CHOICE);
    }
};

const chooseEnvironmentHandler = async (
    choice: EnvironmentChoice,
    storageReady: Promise<void>,
): Promise<EnvironmentChoice> => {
    await storageReady;

    const environments = await readItem(environmentsItem);

    const isUnknownChoice = choice.activeId !== undefined && !findEnvironment(environments, choice.activeId);

    if (isUnknownChoice) {
        throwRpcError(RpcErrorCodes.BAD_REQUEST, CHOICE_ERRORS.UNKNOWN_ENVIRONMENT);
    }

    await writeItem(environmentChoiceItem, choice);

    return choice;
};

export const registerEnvironmentHandlers = (router: Router, storageReady: Promise<void>, enqueue: TaskQueue): void => {
    router.on(environmentsRpc.save, environment => enqueue(() => saveEnvironmentHandler(environment, storageReady)));
    router.on(environmentsRpc.remove, params => enqueue(() => removeEnvironmentHandler(params, storageReady)));
    router.on(environmentsRpc.choose, choice => enqueue(() => chooseEnvironmentHandler(choice, storageReady)));
};
