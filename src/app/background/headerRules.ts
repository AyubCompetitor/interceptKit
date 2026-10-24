import type { HeaderRuleParams } from '#entities/request';
import { DnrTypes, HeaderOperations, ResourceTypes, type DnrRule } from '#entities/rule';

/** The parts of a session rule the helpers below read */
interface SessionRuleRef {
    /** Id of the rule */
    readonly id: number;
    /** Its condition, for the tab */
    readonly condition: {
        /** Tabs the rule is limited to */
        readonly tabIds?: NotRequired<number[]>;
    };
}

/** Who the rule is for: one tab of this extension */
export interface HeaderRuleTarget {
    /** Id of the new session rule */
    readonly id: number;
    /** Above every rule of the user, so the headers typed for the request win */
    readonly priority: number;
    /** Tab of the API client page that sends the request */
    readonly tabId: number;
    /** Id of this extension, the initiator of its own requests */
    readonly extensionId: string;
}

export const buildHeaderRule = (params: HeaderRuleParams, target: HeaderRuleTarget): DnrRule => ({
    id: target.id,
    priority: target.priority,
    action: {
        type: DnrTypes.MODIFY_HEADERS,
        requestHeaders: params.headers.map(header => ({
            header: header.name,
            operation: HeaderOperations.SET,
            value: header.value,
        })),
    },
    condition: {
        requestDomains: [params.host],
        initiatorDomains: [target.extensionId],
        tabIds: [target.tabId],
        resourceTypes: [ResourceTypes.XMLHTTPREQUEST],
    },
});

export const getTabRuleIds = (rules: readonly SessionRuleRef[], tabId: number): number[] => {
    return rules.reduce<number[]>((acc, rule) => {
        if (rule.condition.tabIds?.includes(tabId)) {
            acc.push(rule.id);
        }

        return acc;
    }, []);
};
export const getNextRuleId = (rules: readonly SessionRuleRef[]): number => {
    const ids = rules.map(rule => rule.id);

    return Math.max(0, ...ids) + 1;
};
