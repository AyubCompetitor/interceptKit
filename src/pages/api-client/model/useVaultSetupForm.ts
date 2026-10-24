import { useState, type ChangeEvent, type SubmitEvent } from 'react';

import { vaultRpc } from '#entities/environment';
import { executeRpc } from '#shared/messaging';
import { useProcessAction } from '#shared/ui';

export const useVaultSetupForm = (onDone: VoidFunction) => {
    const [password, setPassword] = useState('');
    const [repeatedPassword, setRepeatedPassword] = useState('');
    const [isMismatch, setIsMismatch] = useState(false);

    const { isFailed, processAction } = useProcessAction();

    const onPasswordChange = (event: ChangeEvent<HTMLInputElement>) => setPassword(event.target.value);

    const onRepeatedPasswordChange = (event: ChangeEvent<HTMLInputElement>) => setRepeatedPassword(event.target.value);

    const onSetupSubmit = (event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();

        const isRepeated = password === repeatedPassword;

        setIsMismatch(!isRepeated);

        if (!isRepeated) {
            return;
        }

        processAction(executeRpc(vaultRpc.create, { password }).then(onDone));
    };

    return {
        password,
        repeatedPassword,
        isMismatch,
        isFailed,
        onPasswordChange,
        onRepeatedPasswordChange,
        onSetupSubmit,
    };
};
