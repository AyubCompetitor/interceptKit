import { isEncryptedValue, type EncryptedValue, type Environment, type EnvVariable } from '#entities/environment';
import { getRandomUUID } from '#shared/lib';

/** A variable as the editor edits it */
export interface VariableDraft {
    /** React key of the row, never saved */
    readonly rowId: string;
    /** Name used in {{name}} templates */
    readonly key: string;
    /** Value as typed; empty while an encrypted value is kept */
    readonly value: string;
    /** Switched-off variables are kept but not used */
    readonly enabled: boolean;
    /** Secret values are hidden on the screen */
    readonly secret: boolean;
    /** An encrypted value the editor cannot show; kept until a new value is typed */
    readonly encryptedValue?: EncryptedValue;
}

/** Every field of the environment form */
export interface EnvironmentDraft {
    /** Id of the edited environment or of the new one */
    readonly id: string;
    /** Name shown in the list and in the choice of environment */
    readonly name: string;
    /** Variables in their order */
    readonly variables: readonly VariableDraft[];
}

export type EnvironmentDraftPatch = Partial<Omit<EnvironmentDraft, 'id'>>;

/** Merges changed fields into the form state */
export type EnvironmentDraftChange = (patch: EnvironmentDraftPatch) => void;

export type VariableDraftPatch = Partial<Omit<VariableDraft, 'rowId'>>;

/** Changes the variable row with the id */
export type VariableDraftChange = (rowId: string, patch: VariableDraftPatch) => void;

export const createVariableDraft = (): VariableDraft => ({
    rowId: getRandomUUID(),
    key: '',
    value: '',
    enabled: true,
    secret: false,
});

const mapVariableToDraft = (variable: EnvVariable): VariableDraft => {
    const draft = {
        ...createVariableDraft(),
        key: variable.key,
        enabled: variable.enabled,
        secret: variable.secret,
    };

    if (isEncryptedValue(variable.value)) {
        return { ...draft, encryptedValue: variable.value };
    }

    return { ...draft, value: variable.value };
};

/** Spaces around a name are a typing slip; an encrypted value stays until a new value replaces it */
const mapDraftToVariable = (draft: VariableDraft): EnvVariable => {
    const variable = {
        key: draft.key.trim(),
        enabled: draft.enabled,
        secret: draft.secret,
    };

    const isEncryptedKept = draft.encryptedValue !== undefined && draft.value === '';

    if (isEncryptedKept) {
        return { ...variable, value: draft.encryptedValue };
    }

    return { ...variable, value: draft.value };
};

/** Form state of an environment; a new one starts with an empty variable */
export const createEnvironmentDraft = (environment: NotRequired<Environment>): EnvironmentDraft => {
    if (environment === undefined) {
        return {
            id: getRandomUUID(),
            name: '',
            variables: [createVariableDraft()],
        };
    }

    return {
        id: environment.id,
        name: environment.name,
        variables: environment.variables.map(mapVariableToDraft),
    };
};

/** The environment the form describes; the background validates it before saving */
export const buildEnvironment = (draft: EnvironmentDraft): Environment => ({
    id: draft.id,
    name: draft.name.trim(),
    variables: draft.variables.map(mapDraftToVariable),
});

export const updateVariableDraft = (
    variables: readonly VariableDraft[],
    rowId: string,
    patch: VariableDraftPatch,
): VariableDraft[] => {
    return variables.map(variable => {
        if (variable.rowId !== rowId) {
            return variable;
        }

        return { ...variable, ...patch };
    });
};
