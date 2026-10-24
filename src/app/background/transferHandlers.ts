import { environmentsItem, environmentsValidator } from '#entities/environment';
import { mocksItem, mocksValidator } from '#entities/mock';
import { rulesItem, rulesValidator } from '#entities/rule';
import {
    mergeBundle,
    parseBundle,
    transferRpc,
    type BundleContent,
    type BundleImportParams,
    type BundleImportResult,
} from '#features/transfer';
import { formatIssues, type Issue, type TaskQueue, type Validator } from '#shared/lib';
import { RpcError, RpcErrorCodes, type Router } from '#shared/messaging';
import { prepareWrite, readItem, writeItems } from '#shared/platform';

import { getRegexError } from './ruleHandlers.ts';
import { prepareEnvironment } from './vaultKey.ts';

const readStoredContent = async (): Promise<BundleContent> => ({
    rules: await readItem(rulesItem),
    mocks: await readItem(mocksItem),
    environments: await readItem(environmentsItem),
});

const getListIssues = <T>(validator: Validator<T>, list: unknown, path: string): readonly Issue[] => {
    const result = validator(list, path);

    if (result.ok) {
        return [];
    }

    return result.issues;
};

/** The merged lists meet the same limits as lists saved one record at a time */
const getContentIssues = (content: BundleContent): Issue[] => [
    ...getListIssues(rulesValidator, content.rules, '$.rules'),
    ...getListIssues(mocksValidator, content.mocks, '$.mocks'),
    ...getListIssues(environmentsValidator, content.environments, '$.environments'),
];

/** The page has shown a preview of the same text; the background checks it again and writes every list in one step */
const importBundleHandler = async (
    { text }: BundleImportParams,
    storageReady: Promise<void>,
): Promise<BundleImportResult> => {
    await storageReady;

    const parsed = parseBundle(text);

    if (!parsed.ok) {
        throw new RpcError(RpcErrorCodes.BAD_REQUEST, formatIssues(parsed.issues));
    }

    const { content, counts } = mergeBundle(await readStoredContent(), parsed.value);
    const contentIssues = getContentIssues(content);

    if (contentIssues.length > 0) {
        throw new RpcError(RpcErrorCodes.BAD_REQUEST, formatIssues(contentIssues));
    }

    const rgxError = await getRegexError(parsed.value.rules, content.rules);

    if (rgxError !== undefined) {
        throw new RpcError(RpcErrorCodes.BAD_REQUEST, rgxError);
    }

    const environments = await Promise.all(content.environments.map(prepareEnvironment));

    await writeItems([
        prepareWrite(rulesItem, content.rules),
        prepareWrite(mocksItem, content.mocks),
        prepareWrite(environmentsItem, environments),
    ]);

    return {
        counts,
    };
};

export const registerTransferHandlers = (router: Router, storageReady: Promise<void>, enqueue: TaskQueue): void => {
    router.on(transferRpc.import, params => enqueue(() => importBundleHandler(params, storageReady)));
};
