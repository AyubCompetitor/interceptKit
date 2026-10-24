import type { RuleHeader } from '../model/outgoingRequest.ts';
import { isBrowserHeader } from '../model/requestHeaders.ts';

import {
    array,
    defineMethod,
    domainName,
    headerName,
    headerValue,
    number,
    object,
    refine,
    type Validator,
} from '#shared/lib';

export interface HeaderRuleParams {
    /** Host the request goes to */
    readonly host: string;
    /** Headers the rule sets */
    readonly headers: readonly RuleHeader[];
}

export interface HeaderRuleIdParams {
    /** Id of the session rule */
    readonly id: number;
}

const HEADER_RULE_ERRORS = {
    BROWSER_HEADER: 'is set by the browser itself',
} as const;

const MAX_RULE_HEADERS = 100;

const getRuleHeaderError = (header: RuleHeader): NotRequired<string> => {
    if (!isBrowserHeader(header.name)) {
        return;
    }

    return `${header.name} ${HEADER_RULE_ERRORS.BROWSER_HEADER}`;
};

const ruleHeader: Validator<RuleHeader> = refine(
    object({
        name: headerName,
        value: headerValue,
    }),
    getRuleHeaderError,
);

const headerRuleParams: Validator<HeaderRuleParams> = object({
    host: domainName,
    headers: array(ruleHeader, { minLength: 1, maxLength: MAX_RULE_HEADERS }),
});

const headerRuleId = object({ id: number({ integer: true, min: 1 }) });

export const headerRulesRpc = {
    apply: defineMethod<HeaderRuleParams, HeaderRuleIdParams>('headerRules/apply', headerRuleParams),
    release: defineMethod<HeaderRuleIdParams, void>('headerRules/release', headerRuleId),
} as const;
