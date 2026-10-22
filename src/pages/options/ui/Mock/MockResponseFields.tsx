import type { FC } from 'react';

import { useMockDraftFields } from '../../lib/useMockDraftFields.ts';
import type { MockDraftFields } from '../../model/mockDraft.ts';

import { MAX_MOCK_DELAY_MS } from '#entities/mock';
import { useTranslation } from '#shared/i18n';
import { CodeEditor, Field, Flex, SegmentedControl, Spaces } from '#shared/ui';

import { BODY_TYPE_LABELS, BODY_TYPE_LANGUAGES } from './mockLabels.ts';
import styles from './MockForm.module.css';
import { MockHeaderList } from './MockHeaderList.tsx';

/** Status codes the browser lets a page see in a response */
const STATUS_RANGE = {
    MIN: 200,
    MAX: 599,
} as const;

/** What the page receives instead of the real response */
export const MockResponseFields: FC<MockDraftFields> = ({ draft, onDraftChange }) => {
    const { t } = useTranslation();
    const { onStatusChange, onDelayChange, onBodyTypeChange, onBodyChange, onHeadersChange } = useMockDraftFields(
        draft,
        onDraftChange,
    );

    return (
        <Flex direction='column' gap={Spaces.L}>
            <div className={styles.numbers}>
                <Field label={t('mockStatus')}>
                    <input
                        inputMode='numeric'
                        max={STATUS_RANGE.MAX}
                        min={STATUS_RANGE.MIN}
                        type='number'
                        value={draft.status}
                        required
                        onChange={onStatusChange}
                    />
                </Field>

                <Field hint={t('mockDelayHint')} label={t('mockDelay')}>
                    <input
                        inputMode='numeric'
                        max={MAX_MOCK_DELAY_MS}
                        min={0}
                        placeholder='0'
                        type='number'
                        value={draft.delayMs}
                        onChange={onDelayChange}
                    />
                </Field>
            </div>

            <SegmentedControl
                labels={BODY_TYPE_LABELS}
                legend={t('mockBodyType')}
                value={draft.bodyType}
                onChange={onBodyTypeChange}
            />

            <CodeEditor
                hint={t('mockBodyHint')}
                label={t('mockBody')}
                language={BODY_TYPE_LANGUAGES[draft.bodyType]}
                value={draft.body}
                onChange={onBodyChange}
            />

            <MockHeaderList headers={draft.headers} onHeadersChange={onHeadersChange} />
        </Flex>
    );
};
