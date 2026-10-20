type ClassName = NotRequired<Nullable<string | false>>;

export const joinClassNames = (...classNames: ClassName[]): NotRequired<string> => {
    const joinedClassNames = classNames.filter(Boolean).join(' ');

    if (!joinedClassNames) {
        return;
    }

    return joinedClassNames;
};
