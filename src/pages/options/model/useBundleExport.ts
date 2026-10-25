import { useState } from 'react';

import { downloadJsonFile } from '../lib/downloadFile.ts';

import {
    BUNDLE_PARTS,
    buildBundleFileName,
    buildBundleText,
    type BundleContent,
    type BundlePart,
} from '#features/transfer';
import { toggleValue } from '#shared/lib';

export const useBundleExport = (content: BundleContent) => {
    const [parts, setParts] = useState<readonly BundlePart[]>(BUNDLE_PARTS);

    const isNothingChosen = !parts.length;

    const onPartToggle = (part: BundlePart) => setParts(current => toggleValue(current, part));

    const onBundleExport = () => {
        const exportedAt = new Date().toISOString();

        downloadJsonFile(buildBundleFileName(exportedAt), buildBundleText(content, parts, exportedAt));
    };

    return {
        parts,
        isNothingChosen,
        onPartToggle,
        onBundleExport,
    };
};
