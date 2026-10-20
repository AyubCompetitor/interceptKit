export enum TypographyColors {
    PRIMARY = 'primary',
    HINT = 'hint',
    DANGER = 'danger',
}

export type TypographyColor = `${TypographyColors}`;

export enum TypographySizes {
    SMALL = 'small',
    MEDIUM = 'medium',
}

export type TypographySize = `${TypographySizes}`;

export type TypographyElement = 'p' | 'span';
