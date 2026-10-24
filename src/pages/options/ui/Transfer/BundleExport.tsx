import { useId, type FC } from 'react';

import { useBundleExport } from '../../model/useBundleExport.ts';

import { BUNDLE_PARTS, type BundleContent } from '#features/transfer';
import { useTranslation } from '#shared/i18n';
import { Button, ButtonVariants, Flex, Spaces, Typography, TypographyColors, TypographySizes } from '#shared/ui';

import { Checklist } from '../Checklist/Checklist.tsx';
import styles from './BundleExport.module.css';
import { BUNDLE_PART_LABELS } from './transferLabels.ts';

interface BundleExportProps {
    /** The lists stored now */
    content: BundleContent;
}

export const BundleExport: FC<BundleExportProps> = ({ content }) => {
    const titleId = useId();
    const { t } = useTranslation();
    const { parts, isNothingChosen, onPartToggle, onBundleExport } = useBundleExport(content);

    return (
        <Flex aria-labelledby={titleId} as='section' className={styles.card} direction='column' gap={Spaces.L}>
            <h2 id={titleId}>{t('transferExportTitle')}</h2>

            <Checklist
                labels={BUNDLE_PART_LABELS}
                legend={t('transferExportParts')}
                selected={parts}
                values={BUNDLE_PARTS}
                onToggle={onPartToggle}
            />

            <Typography color={TypographyColors.HINT} size={TypographySizes.SMALL}>
                {t('transferExportHint')}
            </Typography>

            <div>
                <Button disabled={isNothingChosen} variant={ButtonVariants.PRIMARY} onClick={onBundleExport}>
                    {t('transferExportSubmit')}
                </Button>
            </div>
        </Flex>
    );
};
