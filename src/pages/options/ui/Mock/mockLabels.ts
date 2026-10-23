import { MockBodyTypes, type MockBodyType } from '#entities/mock';
import type { MessageKey } from '#shared/i18n';
import { CodeLanguages, type CodeLanguage, type KeyValueTableLabels } from '#shared/ui';

export const BODY_TYPE_LABELS: Record<MockBodyType, MessageKey> = {
    [MockBodyTypes.JSON]: 'mockBodyJson',
    [MockBodyTypes.TEXT]: 'mockBodyText',
};

export const BODY_TYPE_LANGUAGES: Record<MockBodyType, CodeLanguage> = {
    [MockBodyTypes.JSON]: CodeLanguages.JSON,
    [MockBodyTypes.TEXT]: CodeLanguages.TEXT,
};

export const MOCK_HEADER_LABELS: KeyValueTableLabels = {
    key: 'mockHeaderName',
    value: 'mockHeaderValue',
    enabled: 'mockHeaderEnabled',
    add: 'mockHeaderAdd',
    remove: 'mockHeaderDelete',
    empty: 'mockHeadersEmpty',
};
