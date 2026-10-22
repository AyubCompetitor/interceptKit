import { useState } from 'react';

import type { Environment } from '#entities/environment';

/** Whether the editor is open and which environment it shows; none means a new environment */
export const useEnvironmentEditor = () => {
    const [editedEnvironment, setEditedEnvironment] = useState<NotRequired<Environment>>();
    const [isEditorOpen, setIsEditorOpen] = useState(false);

    const onEnvironmentCreate = () => {
        setEditedEnvironment(undefined);
        setIsEditorOpen(true);
    };

    const onEnvironmentEdit = (environment: Environment) => {
        setEditedEnvironment(environment);
        setIsEditorOpen(true);
    };

    const onEditorClose = () => {
        setIsEditorOpen(false);
    };

    return {
        editedEnvironment,

        isEditorOpen,

        onEnvironmentCreate,
        onEnvironmentEdit,
        onEditorClose,
    };
};
