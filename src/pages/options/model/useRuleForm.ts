import { useState, type SubmitEvent } from 'react';

import { rulesRpc, type Rule } from '#entities/rule';
import { executeRpc } from '#shared/messaging';

import { buildRule, createRuleDraft, type RuleDraftPatch } from './ruleDraft.ts';

const UNKNOWN_ERROR = 'unknown error';

const getErrorText = (error: unknown): string => {
    if (error instanceof Error) {
        return error.message;
    }

    return UNKNOWN_ERROR;
};

export const useRuleForm = (rule: NotRequired<Rule>, onSaved: VoidFunction) => {
    const [draft, setDraft] = useState(() => createRuleDraft(rule));
    const [saveError, setSaveError] = useState<NotRequired<string>>();

    const onDraftChange = (patch: RuleDraftPatch) => {
        setDraft(current => ({ ...current, ...patch }));
    };

    const onRuleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();

        executeRpc(rulesRpc.save, buildRule(draft))
            .then(() => onSaved())
            .catch((error: unknown) => setSaveError(getErrorText(error)));
    };

    return {
        draft,
        saveError,

        onDraftChange,
        onRuleSubmit,
    };
};
