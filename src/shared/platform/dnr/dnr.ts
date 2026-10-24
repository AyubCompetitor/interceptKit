export type DnrRegexSupport = chrome.declarativeNetRequest.IsRegexSupportedResult;

export type ChromeDeclarativeNetRules = chrome.declarativeNetRequest.Rule[];

/** Swaps all dynamic rules for the given ones in one atomic update */
export const replaceDynamicRules = async (rules: ChromeDeclarativeNetRules): Promise<void> => {
    const currentRules = await chrome.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = currentRules.map(rule => rule.id);

    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules: rules });
};

/** Asks the browser whether RE2 can run the regex */
export const getRegexSupport = (regex: string, isCapturing: boolean): Promise<DnrRegexSupport> =>
    chrome.declarativeNetRequest.isRegexSupported({
        regex,
        requireCapturing: isCapturing,
        isCaseSensitive: false,
    });

export const getRegexRuleLimit = (): number => chrome.declarativeNetRequest.MAX_NUMBER_OF_REGEX_RULES;

export const getDynamicRuleLimit = (): number => chrome.declarativeNetRequest.MAX_NUMBER_OF_DYNAMIC_RULES;

/** Session rules live in memory until the browser closes or the extension updates */
export const getSessionRules = (): Promise<ChromeDeclarativeNetRules> => chrome.declarativeNetRequest.getSessionRules();

/** Removes, then adds, in one atomic update */
export const updateSessionRules = async (
    removeRuleIds: readonly number[],
    addRules: ChromeDeclarativeNetRules,
): Promise<void> => {
    await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [...removeRuleIds], addRules });
};
