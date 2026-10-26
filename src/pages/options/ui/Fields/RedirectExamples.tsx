import type { FC } from 'react';

import { useTranslation, type MessageKey } from '#shared/i18n';

import styles from './Examples.module.css';

/** One kind of redirect with a sample of what to type */
interface RedirectExample {
    /** Name of the kind, as the switch above calls it */
    readonly nameKey: MessageKey;
    /** What to type */
    readonly codes: readonly string[];
    /** What happens to a request */
    readonly descriptionKey: MessageKey;
}

const REDIRECT_EXAMPLES: readonly RedirectExample[] = [
    {
        nameKey: 'ruleTargetUrl',
        codes: ['https://staging.example.com/'],
        descriptionKey: 'redirectExampleUrl',
    },
    {
        nameKey: 'ruleTargetSubstitution',
        codes: [String.raw`^https://api\.example\.com/(.*)`, String.raw`https://staging.example.com/\1`],
        descriptionKey: 'redirectExampleSubstitution',
    },
    {
        nameKey: 'ruleTargetTransform',
        codes: ['staging.example.com'],
        descriptionKey: 'redirectExampleTransform',
    },
];

export const RedirectExamples: FC = () => {
    const { t } = useTranslation();

    return (
        <div className={styles.examples}>
            <p className={styles.title}>{t('redirectExamplesTitle')}</p>

            <dl className={styles.kinds}>
                {REDIRECT_EXAMPLES.map(example => (
                    <div key={example.nameKey} className={styles.kind}>
                        <dt className={styles.name}>{t(example.nameKey)}</dt>

                        {example.codes.map(code => (
                            <dd key={code}>
                                <code className={styles.code}>{code}</code>
                            </dd>
                        ))}

                        <dd>{t(example.descriptionKey)}</dd>
                    </div>
                ))}
            </dl>
        </div>
    );
};
