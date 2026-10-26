/** What the editor knows about the text */
export enum CodeLanguages {
    /** Highlighting, a linter and formatting */
    JSON = 'json',
    /** Plain text, edited as is */
    TEXT = 'text',
}

export type CodeLanguage = `${CodeLanguages}`;

/** What the editor view needs to set itself up */
export interface CodeEditorSettings {
    /** Language of the text */
    language: CodeLanguage;
    /** Accessible name of the editing area */
    label: string;
    /** For viewing only */
    isReadOnly: boolean;
    /** Whether {{templates}} stand out */
    isWithTemplates: boolean;
    /** Height in lines that the editor keeps even when empty */
    minRows: number;
    /** Lines shown before the editor scrolls */
    maxRows: number;
}

export interface CodeEditorViewProps {
    /** Text in the editor */
    value: string;
    /** How the editor is set up */
    settings: CodeEditorSettings;
    /** Called with the whole text after every change */
    onChange: (value: string) => void;
}
