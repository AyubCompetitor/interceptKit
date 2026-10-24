import { useState, type ChangeEvent, type SubmitEvent } from 'react';

import { vaultRpc } from '#entities/environment';
import { executeRpc } from '#shared/messaging';
import { useProcessAction } from '#shared/ui';

export const useVaultPasswordChange = (onDone: VoidFunction) => {
    const [password, setPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [repeatedPassword, setRepeatedPassword] = useState('');
    const [isMismatch, setIsMismatch] = useState(false);
    const [isWrongPassword, setIsWrongPassword] = useState(false);

    const { isFailed, processAction } = useProcessAction();

    const applyAnswer = (isAccepted: boolean) => {
        setIsWrongPassword(!isAccepted);

        if (!isAccepted) {
            return;
        }

        onDone();
    };

    const onPasswordChange = (event: ChangeEvent<HTMLInputElement>) => setPassword(event.target.value);

    const onNewPasswordChange = (event: ChangeEvent<HTMLInputElement>) => setNewPassword(event.target.value);

    const onRepeatedPasswordChange = (event: ChangeEvent<HTMLInputElement>) => setRepeatedPassword(event.target.value);

    const onChangeSubmit = (event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();

        const isRepeated = newPassword === repeatedPassword;

        setIsMismatch(!isRepeated);

        if (!isRepeated) {
            return;
        }

        processAction(executeRpc(vaultRpc.changePassword, { password, newPassword }).then(applyAnswer));
    };

    return {
        password,
        newPassword,
        repeatedPassword,
        isMismatch,
        isWrongPassword,
        isFailed,
        onPasswordChange,
        onNewPasswordChange,
        onRepeatedPasswordChange,
        onChangeSubmit,
    };
};
