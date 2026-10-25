import type { FC } from 'react';

import { ImportGapTypes, type ImportGap, type ImportGapType } from '../../model/importGaps.ts';

import { useTranslation, type MessageKey } from '#shared/i18n';
import { Flex, Spaces, Typography } from '#shared/ui';

import styles from './ImportGapList.module.css';

interface ImportGapListProps {
    /** What the file has that is not carried over */
    gaps: readonly ImportGap[];
}

const GAP_LABELS: Readonly<Record<ImportGapType, MessageKey>> = {
    [ImportGapTypes.SCRIPTS]: 'apiClientImportGapScripts',
    [ImportGapTypes.EXAMPLES]: 'apiClientImportGapExamples',
    [ImportGapTypes.BODIES]: 'apiClientImportGapBodies',
    [ImportGapTypes.BODIES_OF_BODYLESS]: 'apiClientImportGapBodiesOfBodyless',
    [ImportGapTypes.AUTHS]: 'apiClientImportGapAuths',
    [ImportGapTypes.BASIC_WITH_VARIABLES]: 'apiClientImportGapBasicWithVariables',
    [ImportGapTypes.METHODS]: 'apiClientImportGapMethods',
    [ImportGapTypes.DYNAMIC_VARIABLES]: 'apiClientImportGapDynamicVariables',
    [ImportGapTypes.DEEP_FOLDERS]: 'apiClientImportGapDeepFolders',
    [ImportGapTypes.VARIABLE_NAMES]: 'apiClientImportGapVariableNames',
    [ImportGapTypes.RELATIVE_SERVER]: 'apiClientImportGapRelativeServer',
    [ImportGapTypes.EXTERNAL_REFS]: 'apiClientImportGapExternalRefs',
    [ImportGapTypes.COOKIE_PARAMETERS]: 'apiClientImportGapCookieParameters',
    [ImportGapTypes.OWN_SERVERS]: 'apiClientImportGapOwnServers',
};

const DETAIL_SEPARATOR = ', ';

const MAX_SHOWN_DETAILS = 10;

const ELLIPSIS = '…';

/** A long list of names is cut, so one gap never fills the dialog */
const formatDetails = (details: readonly string[]): string => {
    const shown = details.slice(0, MAX_SHOWN_DETAILS).join(DETAIL_SEPARATOR);

    if (details.length <= MAX_SHOWN_DETAILS) {
        return shown;
    }

    return `${shown}${DETAIL_SEPARATOR}${ELLIPSIS}`;
};

export const ImportGapList: FC<ImportGapListProps> = ({ gaps }) => {
    const { t } = useTranslation();

    return (
        <Flex direction='column' gap={Spaces.XS}>
            <Typography>{t('apiClientImportGaps')}</Typography>

            <ul className={styles.gaps}>
                {gaps.map(gap => (
                    <li key={gap.gapType}>
                        {t(GAP_LABELS[gap.gapType], formatDetails(gap.details), String(gap.count))}
                    </li>
                ))}
            </ul>
        </Flex>
    );
};
