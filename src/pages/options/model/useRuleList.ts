import { useState } from 'react';

import { rulesItem, rulesRpc, type Rule } from '#entities/rule';
import { executeRpc } from '#shared/messaging';
import { useStorageItem } from '#shared/platform';

export const useRuleList = () => {
    const rules = useStorageItem(rulesItem);
    const [isActionFailed, setIsActionFailed] = useState(false);

    const onRuleToggle = (rule: Rule) => {
        executeRpc(rulesRpc.save, { ...rule, enabled: !rule.enabled })
            .then(() => setIsActionFailed(false))
            .catch(() => setIsActionFailed(true));
    };

    const onRuleDelete = (rule: Rule) => {
        executeRpc(rulesRpc.remove, { id: rule.id })
            .then(() => setIsActionFailed(false))
            .catch(() => setIsActionFailed(true));
    };

    return {
        rules,
        isActionFailed,
        onRuleToggle,
        onRuleDelete,
    };
};
