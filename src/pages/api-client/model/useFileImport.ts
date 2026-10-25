import { useState, type ChangeEvent } from 'react';

import { environmentsRpc, MAX_ENVIRONMENTS } from '#entities/environment';
import { apiClientDatabase, collectionsStore, MAX_COLLECTIONS } from '#entities/request';
import { isVaultRequired, usePolicy } from '#features/policy';
import { getErrorText } from '#shared/lib';
import { executeRpc } from '#shared/messaging';
import { writeRecord } from '#shared/platform';

import type { ImportNames } from './importNames.ts';
import {
    applyImportSecretMode,
    countTypedSecrets,
    getEmptySecretNames,
    getImportSecretMode,
    type ImportSecretMode,
} from './importSecrets.ts';
import type { ImportedFile } from './importedFile.ts';
import { parseImportFile } from './importFile.ts';
import { useCollections } from './useCollections.ts';
import { useEnvironments } from './useEnvironments.ts';
import { useVault } from './useVault.ts';

/** The environment goes first: the background may refuse it, and then the collection is not written either */
const writeImportedFile = async (importedFile: ImportedFile, secretMode: ImportSecretMode): Promise<void> => {
    const { collection, environment } = importedFile;

    if (environment) {
        await executeRpc(environmentsRpc.save, applyImportSecretMode(environment, secretMode));
    }

    if (collection) {
        await writeRecord(apiClientDatabase, collectionsStore, { ...collection, createdAt: Date.now() });
    }
};

export const useFileImport = (names: ImportNames, onImported: VoidFunction) => {
    const [text, setText] = useState('');
    const [importError, setImportError] = useState<NotRequired<string>>();
    const [isFileUnreadable, setIsFileUnreadable] = useState(false);
    const [isImporting, setIsImporting] = useState(false);

    const { vaultState } = useVault();
    const { policy } = usePolicy();
    const { environments } = useEnvironments();
    const { collections } = useCollections();

    const isTextEmpty = text.trim() === '';
    const parsed = isTextEmpty ? undefined : parseImportFile(text, names);
    const importedFile = parsed?.ok ? parsed.value : undefined;
    const secretMode = getImportSecretMode(vaultState, isVaultRequired(policy));
    const secretCount = countTypedSecrets(importedFile?.environment);
    const emptySecretNames = getEmptySecretNames(importedFile?.environment);
    const isCollectionLimitReached = !!importedFile?.collection && collections.length >= MAX_COLLECTIONS;
    const isEnvironmentLimitReached = !!importedFile?.environment && environments.length >= MAX_ENVIRONMENTS;
    const isImportBlocked = !importedFile || isImporting || isCollectionLimitReached || isEnvironmentLimitReached;

    const applyText = (nextText: string) => {
        setText(nextText);
        setImportError(undefined);
        setIsFileUnreadable(false);
    };

    const failImport = (error: unknown) => {
        setIsImporting(false);
        setImportError(getErrorText(error));
    };

    const onTextChange = (event: ChangeEvent<HTMLTextAreaElement>) => applyText(event.target.value);

    const onFileChoose = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        file.text()
            .then(applyText)
            .catch(() => setIsFileUnreadable(true));
    };

    const onImportConfirm = () => {
        if (!importedFile || isImportBlocked) {
            return;
        }

        setIsImporting(true);

        writeImportedFile(importedFile, secretMode).then(onImported).catch(failImport);
    };

    return {
        text,
        parsed,
        importedFile,
        secretMode,
        secretCount,
        emptySecretNames,
        importError,
        isFileUnreadable,
        isCollectionLimitReached,
        isEnvironmentLimitReached,
        isImportBlocked,
        onTextChange,
        onFileChoose,
        onImportConfirm,
    };
};
