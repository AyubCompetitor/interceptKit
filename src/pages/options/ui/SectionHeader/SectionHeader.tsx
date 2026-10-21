import type { FC, ReactNode } from 'react';

import { Flex, Spaces, Typography, TypographyColors } from '#shared/ui';

import styles from './SectionHeader.module.css';

interface SectionHeaderProps {
    /** Id of the heading, for the section's aria-labelledby */
    titleId: string;
    /** Heading of the section */
    title: string;
    /** What the section is for */
    description: string;
    /** The main action of the section, usually a button */
    action?: ReactNode;
}

export const SectionHeader: FC<SectionHeaderProps> = ({ titleId, title, description, action }) => (
    <Flex align='start' as='header' gap={Spaces.L} justify='between'>
        <Flex className={styles.text} direction='column' gap={Spaces.S}>
            <h1 id={titleId}>{title}</h1>

            <Typography color={TypographyColors.HINT}>{description}</Typography>
        </Flex>

        {action}
    </Flex>
);
