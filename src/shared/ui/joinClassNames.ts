type ClassName = string | false | null | undefined;

export const joinClassNames = (...classNames: ClassName[]): NotRequired<string> =>
    classNames.filter(Boolean).join(' ') || undefined;
