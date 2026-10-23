import { useState, type ChangeEvent, type SubmitEvent } from 'react';

import type { VaultPasswordParams } from '#entities/environment';
import type { RpcMethod } from '#shared/lib';
import { executeRpc } from '#shared/messaging';

export const useVaultPasswordForm = (method: RpcMethod<VaultPasswordParams, boolean>, onDone: VoidFunction) => {
    const [password, setPassword] = useState('');
    const [isWrongPassword, setIsWrongPassword] = useState(false);
    const [isFailed, setIsFailed] = useState(false);

    const applyAnswer = (isAccepted: boolean) => {
        setIsFailed(false);
        setIsWrongPassword(!isAccepted);

        if (!isAccepted) {
            return;
        }

        onDone();
    };

    const onPasswordChange = (event: ChangeEvent<HTMLInputElement>) => setPassword(event.target.value);

    const onPasswordSubmit = (event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();

        executeRpc(method, { password })
            .then(applyAnswer)
            .catch(() => setIsFailed(true));
    };

    return {
        password,
        isWrongPassword,
        isFailed,
        onPasswordChange,
        onPasswordSubmit,
    };
};
