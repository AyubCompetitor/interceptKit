const JSON_TYPE = 'application/json';

/** Saves the text through a link the browser downloads, so the extension needs no downloads permission */
export const downloadJsonFile = (fileName: string, text: string): void => {
    const url = URL.createObjectURL(new Blob([text], { type: JSON_TYPE }));
    const link = document.createElement('a');

    link.href = url;
    link.download = fileName;
    link.click();

    window.setTimeout(() => URL.revokeObjectURL(url));
};
