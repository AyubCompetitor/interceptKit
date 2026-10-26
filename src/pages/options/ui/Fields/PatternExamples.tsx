import { Fragment, type FC } from 'react';

import type { SyntaxType } from '../../model/ruleDraft.ts';

import { useTranslation, type MessageKey } from '#shared/i18n';
import { SyntaxTypes } from '#shared/lib';
import { Typography, TypographyColors, TypographySizes } from '#shared/ui';

import styles from './Examples.module.css';

interface PatternExamplesProps {
    /** The syntax the field takes now */
    syntaxType: SyntaxType;
}

/** A pattern and what it does */
interface PatternExample {
    /** The pattern as it is typed */
    readonly code: string;
    /** What it matches */
    readonly descriptionKey: MessageKey;
}

interface PatternGuide {
    /** Heading of the card */
    readonly titleKey: MessageKey;
    /** What the special characters mean */
    readonly symbols: readonly PatternExample[];
    /** Whole patterns */
    readonly examples: readonly PatternExample[];
    /** What else to keep in mind */
    readonly noteKey?: MessageKey;
}

const PATTERN_GUIDES: Readonly<Record<SyntaxType, PatternGuide>> = {
    [SyntaxTypes.FILTER]: {
        titleKey: 'patternFilterTitle',
        symbols: [
            { code: '||', descriptionKey: 'patternFilterDomain' },
            { code: '|', descriptionKey: 'patternFilterEdge' },
            { code: '*', descriptionKey: 'patternFilterAny' },
            { code: '^', descriptionKey: 'patternFilterSeparator' },
        ],
        examples: [
            { code: '||example.com^', descriptionKey: 'patternFilterExampleSite' },
            { code: '||api.example.com/v1/', descriptionKey: 'patternFilterExamplePrefix' },
            { code: '|https://example.com/login|', descriptionKey: 'patternFilterExampleExact' },
            { code: '||cdn.example.com/*.js', descriptionKey: 'patternFilterExampleScripts' },
            { code: '/graphql', descriptionKey: 'patternFilterExampleContains' },
        ],
    },
    [SyntaxTypes.RGX]: {
        titleKey: 'patternRegexTitle',
        symbols: [],
        examples: [
            { code: String.raw`^https://api\.example\.com/v1/(.*)`, descriptionKey: 'patternRegexExampleGroup' },
            { code: String.raw`^https?://(www\.)?example\.com/`, descriptionKey: 'patternRegexExampleWww' },
            { code: String.raw`\.(png|jpe?g)(\?|$)`, descriptionKey: 'patternRegexExampleImages' },
            { code: '/users/[0-9]+$', descriptionKey: 'patternRegexExampleId' },
        ],
        noteKey: 'patternRegexNote',
    },
};

export const PatternExamples: FC<PatternExamplesProps> = ({ syntaxType }) => {
    const { t } = useTranslation();

    const { titleKey, symbols, examples, noteKey } = PATTERN_GUIDES[syntaxType];

    return (
        <div className={styles.examples}>
            <p className={styles.title}>{t(titleKey)}</p>

            {!!symbols.length && (
                <dl className={styles.list}>
                    {symbols.map(symbol => (
                        <Fragment key={symbol.code}>
                            <dt>
                                <code className={styles.code}>{symbol.code}</code>
                            </dt>
                            <dd>{t(symbol.descriptionKey)}</dd>
                        </Fragment>
                    ))}
                </dl>
            )}

            <p className={styles.subtitle}>{t('patternExamplesTitle')}</p>

            <dl className={styles.kinds}>
                {examples.map(example => (
                    <div key={example.code} className={styles.kind}>
                        <dt>
                            <code className={styles.code}>{example.code}</code>
                        </dt>
                        <dd>{t(example.descriptionKey)}</dd>
                    </div>
                ))}
            </dl>

            {noteKey && (
                <Typography color={TypographyColors.HINT} size={TypographySizes.SMALL}>
                    {t(noteKey)}
                </Typography>
            )}
        </div>
    );
};
