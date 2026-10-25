import { useState, type ChangeEvent } from 'react';

import type { ApiRequest } from '#entities/request';
import { isVaultRequired, usePolicy } from '#features/policy';
import { writeClipboardText } from '#shared/platform';
import { useProcessAction } from '#shared/ui';

import { buildCurlExport } from './curlExport.ts';
import { useActiveEnvironment } from './useActiveEnvironment.ts';
import { useVaultSecrets } from './useVaultSecrets.ts';

/** Secrets are opened only once the user asks for them in the command */
export const useCurlExport = (request: ApiRequest) => {
    const [isWithSecrets, setIsWithSecrets] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    const environment = useActiveEnvironment();
    const secrets = useVaultSecrets(isWithSecrets ? environment : undefined);
    const { policy } = usePolicy();
    const { isFailed: isCopyFailed, processAction } = useProcessAction();

    const options = { isWithSecrets, isVaultRequired: isVaultRequired(policy) };
    const { command, missingNames } = buildCurlExport(request, environment, secrets, options);
    const isWithSecretVariables = !!environment?.variables.some(variable => variable.secret);

    const markCopied = () => setIsCopied(true);

    const onSecretsToggle = (event: ChangeEvent<HTMLInputElement>) => {
        setIsWithSecrets(event.target.checked);
        setIsCopied(false);
    };

    const onCommandCopy = () => processAction(writeClipboardText(command).then(markCopied));

    return {
        command,
        missingNames,
        isWithSecrets,
        isWithSecretVariables,
        isCopied,
        isCopyFailed,
        onSecretsToggle,
        onCommandCopy,
    };
};
