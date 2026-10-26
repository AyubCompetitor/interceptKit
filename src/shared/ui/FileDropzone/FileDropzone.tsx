import type { ChangeEvent, FC } from 'react';

import { Icon, IconNames } from '../Icon/index.ts';
import { joinClassNames } from '../joinClassNames.ts';

import { useTranslation } from '#shared/i18n';

import styles from './FileDropzone.module.css';
import { useFileDropzone } from './useFileDropzone.ts';

interface FileDropzoneProps {
    /** Name of the file field */
    label: string;
    /** File types the chooser offers */
    accept?: string;
    /** What the zone says under the prompt, such as the size the file may have */
    hint?: string;
    /** Called when a file is chosen or dropped */
    onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

/** The native file field covers the whole zone, so the browser itself takes a click or a dropped file */
export const FileDropzone: FC<FileDropzoneProps> = ({ label, accept, hint, onChange }) => {
    const { t } = useTranslation();
    const { fileName, isDragOver, onFileChange, onDragEnter, onDragLeave } = useFileDropzone(onChange);

    return (
        <span className={joinClassNames(styles.zone, isDragOver && styles.isDragOver)}>
            <input
                accept={accept}
                aria-label={label}
                className={styles.input}
                type='file'
                onChange={onFileChange}
                onDragEnter={onDragEnter}
                onDragLeave={onDragLeave}
                onDrop={onDragLeave}
            />

            <Icon className={styles.icon} name={IconNames.FILE} />

            <span className={styles.text}>
                <span className={styles.title}>{fileName || t('fileDropzonePrompt')}</span>

                <span className={styles.hint}>{fileName ? t('fileDropzoneReplace') : hint}</span>
            </span>
        </span>
    );
};
