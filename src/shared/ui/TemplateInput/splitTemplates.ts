/** A piece of the text, a {{template}} or the text between them */
export interface TemplatePart {
    /** The piece as it is */
    readonly text: string;
    /** Where it starts in the whole text, which also keys it */
    readonly start: number;
    /** Whether it is a {{template}} */
    readonly isTemplate: boolean;
}

const TEMPLATE_RGX = /\{\{[^{}]*\}\}/g;

export const splitTemplates = (text: string): TemplatePart[] => {
    const parts: TemplatePart[] = [];
    let end = 0;

    for (const match of text.matchAll(TEMPLATE_RGX)) {
        if (match.index > end) {
            parts.push({ text: text.slice(end, match.index), start: end, isTemplate: false });
        }

        parts.push({ text: match[0], start: match.index, isTemplate: true });
        end = match.index + match[0].length;
    }

    if (end < text.length) {
        parts.push({ text: text.slice(end), start: end, isTemplate: false });
    }

    return parts;
};
