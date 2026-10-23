import { RequestSections, type RequestSection } from '../../lib/requestSections.ts';

import { RequestBodyTypes, type RequestBodyType } from '#entities/request';
import type { MessageKey } from '#shared/i18n';
import type { KeyValueTableLabels } from '#shared/ui';

export const REQUEST_SECTION_LABELS: Record<RequestSection, MessageKey> = {
    [RequestSections.PARAMS]: 'apiClientSectionParams',
    [RequestSections.HEADERS]: 'apiClientSectionHeaders',
    [RequestSections.BODY]: 'apiClientSectionBody',
    [RequestSections.SETTINGS]: 'apiClientSectionSettings',
};

export const BODY_TYPE_LABELS: Record<RequestBodyType, MessageKey> = {
    [RequestBodyTypes.NONE]: 'apiClientBodyNone',
    [RequestBodyTypes.JSON]: 'apiClientBodyJson',
    [RequestBodyTypes.RAW]: 'apiClientBodyRaw',
    [RequestBodyTypes.FORM]: 'apiClientBodyForm',
};

export const QUERY_LABELS: KeyValueTableLabels = {
    key: 'apiClientParamKey',
    value: 'apiClientValue',
    enabled: 'apiClientParamEnabled',
    add: 'apiClientParamAdd',
    remove: 'apiClientParamDelete',
    empty: 'apiClientParamsEmpty',
};

export const HEADER_LABELS: KeyValueTableLabels = {
    key: 'apiClientHeaderKey',
    value: 'apiClientValue',
    enabled: 'apiClientHeaderEnabled',
    add: 'apiClientHeaderAdd',
    remove: 'apiClientHeaderDelete',
    empty: 'apiClientHeadersEmpty',
};

export const FORM_FIELD_LABELS: KeyValueTableLabels = {
    key: 'apiClientFieldKey',
    value: 'apiClientValue',
    enabled: 'apiClientFieldEnabled',
    add: 'apiClientFieldAdd',
    remove: 'apiClientFieldDelete',
    empty: 'apiClientFieldsEmpty',
};
