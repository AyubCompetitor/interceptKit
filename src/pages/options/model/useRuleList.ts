import { rulesItem, rulesRpc, type Rule } from '#entities/rule';
import { executeRpc } from '#shared/messaging';
import { useStorageItem } from '#shared/platform';
import { useProcessAction } from '#shared/ui';

export const useRuleList = () => {
    const rules = useStorageItem(rulesItem);
    const { isFailed: isActionFailed, processAction } = useProcessAction();

    const onRuleToggle = (rule: Rule) => processAction(executeRpc(rulesRpc.save, { ...rule, enabled: !rule.enabled }));

    const onRuleDelete = (rule: Rule) => processAction(executeRpc(rulesRpc.remove, { id: rule.id }));

    return {
        rules,
        isActionFailed,
        onRuleToggle,
        onRuleDelete,
    };
};
