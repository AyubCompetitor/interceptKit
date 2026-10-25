import type { FC } from 'react';

import { ImportSecretModes, type ImportSecretMode } from '../../model/importSecrets.ts';
import type { ImportedFile } from '../../model/importedFile.ts';

import { MAX_ENVIRONMENTS } from '#entities/environment';
import { countCollectionItems, MAX_COLLECTIONS } from '#entities/request';
import { useTranslation, type MessageKey } from '#shared/i18n';
import { Flex, Notice, NoticeTones, Spaces, Typography, TypographyColors, type NoticeTone } from '#shared/ui';

import { ImportGapList } from './ImportGapList.tsx';

interface ImportPreviewProps {
    /** What the file brings */
    importedFile: ImportedFile;
    /** What happens to its secret values */
    secretMode: ImportSecretMode;
    /** Secret variables of the file that have a value */
    secretCount: number;
    /** Secret variables the file leaves without a value */
    emptySecretNames: readonly string[];
    /** Whether there is no room for one more collection */
    isCollectionLimitReached: boolean;
    /** Whether there is no room for one more environment */
    isEnvironmentLimitReached: boolean;
}

interface SecretNotice {
    /** What the notice says */
    readonly messageKey: MessageKey;
    /** How loud it is */
    readonly tone: NoticeTone;
}

const SECRET_NOTICES: Readonly<Record<ImportSecretMode, SecretNotice>> = {
    [ImportSecretModes.PLAIN]: { messageKey: 'apiClientImportSecretsPlain', tone: NoticeTones.WARNING },
    [ImportSecretModes.ENCRYPTED]: { messageKey: 'apiClientImportSecretsEncrypted', tone: NoticeTones.INFO },
    [ImportSecretModes.LOCKED]: { messageKey: 'apiClientImportSecretsLocked', tone: NoticeTones.WARNING },
    [ImportSecretModes.REQUIRED]: { messageKey: 'apiClientImportSecretsRequired', tone: NoticeTones.WARNING },
};

export const ImportPreview: FC<ImportPreviewProps> = ({
    importedFile,
    secretMode,
    secretCount,
    emptySecretNames,
    isCollectionLimitReached,
    isEnvironmentLimitReached,
}) => {
    const { t } = useTranslation();

    const { collection, environment, gaps } = importedFile;
    const counts = countCollectionItems({ items: collection?.items ?? [] });
    const secretNotice = SECRET_NOTICES[secretMode];

    return (
        <Flex aria-label={t('apiClientImportPreview')} as='section' direction='column' gap={Spaces.M}>
            <Typography>{t('apiClientImportPreview')}</Typography>

            {collection && (
                <Typography>
                    {t('apiClientImportCollection', collection.name, String(counts.requests), String(counts.folders))}
                </Typography>
            )}

            {environment && (
                <Typography>
                    {t('apiClientImportEnvironment', environment.name, String(environment.variables.length))}
                </Typography>
            )}

            {!!secretCount && <Notice tone={secretNotice.tone}>{t(secretNotice.messageKey)}</Notice>}

            {!!emptySecretNames.length && (
                <Notice tone={NoticeTones.INFO}>{t('apiClientImportEmptySecrets', emptySecretNames.join(', '))}</Notice>
            )}

            {isCollectionLimitReached && (
                <Typography color={TypographyColors.DANGER} role='alert'>
                    {t('apiClientCollectionsLimit', String(MAX_COLLECTIONS))}
                </Typography>
            )}

            {isEnvironmentLimitReached && (
                <Typography color={TypographyColors.DANGER} role='alert'>
                    {t('apiClientImportEnvironmentsLimit', String(MAX_ENVIRONMENTS))}
                </Typography>
            )}

            {!!gaps.length && <ImportGapList gaps={gaps} />}
        </Flex>
    );
};
