import type { ChangeEvent } from 'react';

import type {
    HeaderOpDraft,
    RuleDraft,
    RuleDraftChange,
    RuleType,
    SchemeChoice,
    SyntaxType,
    TargetType,
} from '../model/ruleDraft.ts';

import type { ResourceType } from '#entities/rule';
import type { HttpMethod } from '#shared/lib';

import { toggleValue } from './toggleValue.ts';

export const useRuleDraftFields = (draft: RuleDraft, onDraftChange: RuleDraftChange) => {
    const onNameChange = (event: ChangeEvent<HTMLInputElement>) => {
        onDraftChange({ name: event.target.value });
    };

    const onTypeChange = (type: RuleType) => {
        onDraftChange({ type });
    };

    const onSyntaxChange = (syntaxType: SyntaxType) => {
        onDraftChange({ syntaxType });
    };

    const onPatternChange = (event: ChangeEvent<HTMLInputElement>) => {
        onDraftChange({ pattern: event.target.value });
    };

    const onMethodToggle = (method: HttpMethod) => {
        onDraftChange({ methods: toggleValue(draft.methods, method) });
    };

    const onResourceTypeToggle = (resourceType: ResourceType) => {
        onDraftChange({ resourceTypes: toggleValue(draft.resourceTypes, resourceType) });
    };

    const onInitiatorDomainsChange = (event: ChangeEvent<HTMLInputElement>) => {
        onDraftChange({ initiatorDomains: event.target.value });
    };

    const onTargetTypeChange = (targetType: TargetType) => {
        onDraftChange({ targetType });
    };

    const onUrlChange = (event: ChangeEvent<HTMLInputElement>) => {
        onDraftChange({ url: event.target.value });
    };

    const onSubstitutionChange = (event: ChangeEvent<HTMLInputElement>) => {
        onDraftChange({ regexSubstitution: event.target.value });
    };

    const onSchemeChange = (scheme: SchemeChoice) => {
        onDraftChange({ scheme });
    };

    const onHostChange = (event: ChangeEvent<HTMLInputElement>) => {
        onDraftChange({ host: event.target.value });
    };

    const onPortChange = (event: ChangeEvent<HTMLInputElement>) => {
        onDraftChange({ port: event.target.value });
    };

    const onPathChange = (event: ChangeEvent<HTMLInputElement>) => {
        onDraftChange({ path: event.target.value });
    };

    const onRequestHeadersChange = (requestHeaders: HeaderOpDraft[]) => {
        onDraftChange({ requestHeaders });
    };

    const onResponseHeadersChange = (responseHeaders: HeaderOpDraft[]) => {
        onDraftChange({ responseHeaders });
    };

    return {
        onNameChange,
        onTypeChange,
        onSyntaxChange,
        onPatternChange,
        onMethodToggle,
        onResourceTypeToggle,
        onInitiatorDomainsChange,
        onTargetTypeChange,
        onUrlChange,
        onSubstitutionChange,
        onSchemeChange,
        onHostChange,
        onPortChange,
        onPathChange,
        onRequestHeadersChange,
        onResponseHeadersChange,
    };
};
