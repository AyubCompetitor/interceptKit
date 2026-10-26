import { useState, type ChangeEvent } from 'react';

export const useFileDropzone = (onChange: (event: ChangeEvent<HTMLInputElement>) => void) => {
    const [fileName, setFileName] = useState('');
    const [isDragOver, setIsDragOver] = useState(false);

    const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        setFileName(event.target.files?.[0]?.name ?? '');
        onChange(event);
    };

    const onDragEnter = () => setIsDragOver(true);

    const onDragLeave = () => setIsDragOver(false);

    return {
        fileName,
        isDragOver,
        onFileChange,
        onDragEnter,
        onDragLeave,
    };
};
