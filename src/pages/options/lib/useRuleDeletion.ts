import { useState } from 'react';

import type { Rule } from '#entities/rule';

export const useRuleDeletion = (onRuleDelete: (rule: Rule) => void) => {
    const [ruleToDelete, setRuleToDelete] = useState<NotRequired<Rule>>();

    const onDeleteRequest = (rule: Rule) => {
        setRuleToDelete(rule);
    };

    const onDeleteCancel = () => {
        setRuleToDelete(undefined);
    };

    const onDeleteConfirm = () => {
        const isWaiting = ruleToDelete !== undefined;

        if (isWaiting) {
            onRuleDelete(ruleToDelete);
        }

        setRuleToDelete(undefined);
    };

    return {
        ruleToDelete,

        onDeleteRequest,
        onDeleteCancel,
        onDeleteConfirm,
    };
};
