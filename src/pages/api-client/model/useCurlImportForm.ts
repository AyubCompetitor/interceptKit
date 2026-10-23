import { useState, type ChangeEvent, type SubmitEvent } from 'react';

import { parseCurl, type CurlImport } from '#entities/request';
import type { Issue } from '#shared/lib';

const ISSUE_SEPARATOR = '; ';

/** The parser speaks of the whole command, so the path of an issue says nothing */
const getIssueText = (issues: readonly Issue[]): string => issues.map(issue => issue.message).join(ISSUE_SEPARATOR);

export const useCurlImportForm = (onImport: (imported: CurlImport) => void, onDone: VoidFunction) => {
    const [command, setCommand] = useState('');
    const [importError, setImportError] = useState<NotRequired<string>>();

    const onCommandChange = (event: ChangeEvent<HTMLTextAreaElement>) => setCommand(event.target.value);

    const onImportSubmit = (event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();

        const result = parseCurl(command);

        if (!result.ok) {
            setImportError(getIssueText(result.issues));

            return;
        }

        onImport(result.value);
        onDone();
    };

    return {
        command,
        importError,
        onCommandChange,
        onImportSubmit,
    };
};
