/** Extension pages may write to the clipboard at the user's click without the clipboardWrite permission */
export const writeClipboardText = (text: string): Promise<void> => navigator.clipboard.writeText(text);
