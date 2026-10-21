import type { ComponentProps, FC } from 'react';

import { joinClassNames } from '../joinClassNames.ts';

import styles from './Button.module.css';
import { ButtonSizes, ButtonVariants, type ButtonSize, type ButtonVariant } from './types.ts';

interface ButtonProps extends ComponentProps<'button'> {
    /** Visual weight of the action */
    variant?: ButtonVariant;
    /** Height and padding */
    size?: ButtonSize;
    /** Stretches the button to the width of its container */
    isBlock?: boolean;
    /** A square button with an icon only; give it an aria-label */
    isIconOnly?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, NotRequired<string>> = {
    [ButtonVariants.PRIMARY]: styles.primary,
    [ButtonVariants.SECONDARY]: styles.secondary,
    [ButtonVariants.GHOST]: styles.ghost,
    [ButtonVariants.DANGER]: styles.danger,
};

const SIZE_CLASSES: Record<ButtonSize, NotRequired<string>> = {
    [ButtonSizes.SMALL]: styles.small,
    [ButtonSizes.MEDIUM]: styles.medium,
};

export const Button: FC<ButtonProps> = ({
    variant = ButtonVariants.SECONDARY,
    size = ButtonSizes.MEDIUM,
    isBlock = false,
    isIconOnly = false,
    type = 'button',
    className,
    ...rest
}) => (
    <button
        className={joinClassNames(
            styles.button,
            VARIANT_CLASSES[variant],
            SIZE_CLASSES[size],
            isBlock && styles.block,
            isIconOnly && styles.iconOnly,
            className,
        )}
        type={type}
        {...rest}
    />
);
