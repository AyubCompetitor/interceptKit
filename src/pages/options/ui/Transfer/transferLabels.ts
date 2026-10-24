import { BundleParts, type BundlePart } from '#features/transfer';
import type { MessageKey } from '#shared/i18n';

export const BUNDLE_PART_LABELS: Readonly<Record<BundlePart, MessageKey>> = {
    [BundleParts.RULES]: 'transferPartRules',
    [BundleParts.MOCKS]: 'transferPartMocks',
    [BundleParts.ENVIRONMENTS]: 'transferPartEnvironments',
};
