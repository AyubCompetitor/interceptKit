import { useState } from 'react';

import type { Rule } from '#entities/rule';

/** Whether the editor is open and which rule it shows; none means a new rule */
export const useRuleEditor = () => {
    const [editedRule, setEditedRule] = useState<NotRequired<Rule>>();
    const [isEditorOpen, setIsEditorOpen] = useState(false);

    const onRuleCreate = () => {
        setEditedRule(undefined);
        setIsEditorOpen(true);
    };

    const onRuleEdit = (rule: Rule) => {
        setEditedRule(rule);
        setIsEditorOpen(true);
    };

    const onEditorClose = () => {
        setIsEditorOpen(false);
    };

    return {
        editedRule,
        isEditorOpen,
        onRuleCreate,
        onRuleEdit,
        onEditorClose,
    };
};
