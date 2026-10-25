import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { crc32, deflateRawSync } from 'node:zlib';

/** A file ready to go into the archive */
interface PackedEntry {
    /** Path inside the archive, with forward slashes, in UTF-8 */
    readonly name: Buffer;
    /** Length of the file as it is */
    readonly size: number;
    /** CRC-32 of the file as it is */
    readonly crc: number;
    /** How the bytes are stored */
    readonly method: number;
    /** The stored bytes */
    readonly packed: Buffer;
}

const SIGNATURES = {
    LOCAL: 0x04034b50,
    CENTRAL: 0x02014b50,
    END: 0x06054b50,
} as const;

const METHODS = {
    STORE: 0,
    DEFLATE: 8,
} as const;

const HEADER_SIZES = {
    LOCAL: 30,
    CENTRAL: 46,
    END: 22,
} as const;

const VERSION_NEEDED = 20;

const UTF8_NAMES_FLAG = 0x0800;

const DOS_TIME = 0;

const DOS_DATE = (1 << 5) | 1;

const listFiles = (folder: string): string[] => {
    const files: string[] = [];

    for (const entry of readdirSync(folder, { recursive: true, withFileTypes: true })) {
        if (!entry.isFile()) {
            continue;
        }

        files.push(join(entry.parentPath, entry.name));
    }

    return files;
};

const packFile = (folder: string, path: string): PackedEntry => {
    const data = readFileSync(path);
    const deflated = deflateRawSync(data, { level: 9 });
    const isDeflated = deflated.length < data.length;

    return {
        name: Buffer.from(relative(folder, path).split(sep).join('/')),
        size: data.length,
        crc: crc32(data),
        method: isDeflated ? METHODS.DEFLATE : METHODS.STORE,
        packed: isDeflated ? deflated : data,
    };
};

const writeEntryFields = (header: Buffer, entry: PackedEntry, start: number): void => {
    header.writeUInt16LE(VERSION_NEEDED, start);
    header.writeUInt16LE(UTF8_NAMES_FLAG, start + 2);
    header.writeUInt16LE(entry.method, start + 4);
    header.writeUInt16LE(DOS_TIME, start + 6);
    header.writeUInt16LE(DOS_DATE, start + 8);
    header.writeUInt32LE(entry.crc, start + 10);
    header.writeUInt32LE(entry.packed.length, start + 14);
    header.writeUInt32LE(entry.size, start + 18);
    header.writeUInt16LE(entry.name.length, start + 22);
};

const buildLocalHeader = (entry: PackedEntry): Buffer => {
    const header = Buffer.alloc(HEADER_SIZES.LOCAL);

    header.writeUInt32LE(SIGNATURES.LOCAL, 0);
    writeEntryFields(header, entry, 4);

    return Buffer.concat([header, entry.name]);
};

const buildCentralHeader = (entry: PackedEntry, offset: number): Buffer => {
    const header = Buffer.alloc(HEADER_SIZES.CENTRAL);

    header.writeUInt32LE(SIGNATURES.CENTRAL, 0);
    header.writeUInt16LE(VERSION_NEEDED, 4);
    writeEntryFields(header, entry, 6);
    header.writeUInt32LE(offset, 42);

    return Buffer.concat([header, entry.name]);
};

const buildEndRecord = (count: number, directorySize: number, directoryOffset: number): Buffer => {
    const record = Buffer.alloc(HEADER_SIZES.END);

    record.writeUInt32LE(SIGNATURES.END, 0);
    record.writeUInt16LE(count, 8);
    record.writeUInt16LE(count, 10);
    record.writeUInt32LE(directorySize, 12);
    record.writeUInt32LE(directoryOffset, 16);

    return record;
};

export const zipFolder = (folder: string): Buffer => {
    const paths = listFiles(folder).toSorted();
    const entries = paths.map(path => packFile(folder, path));

    const parts: Buffer[] = [];
    const directory: Buffer[] = [];

    let offset = 0;

    for (const entry of entries) {
        const localHeader = buildLocalHeader(entry);

        directory.push(buildCentralHeader(entry, offset));
        parts.push(localHeader, entry.packed);
        offset += localHeader.length + entry.packed.length;
    }

    const directoryBytes = Buffer.concat(directory);

    return Buffer.concat([...parts, directoryBytes, buildEndRecord(entries.length, directoryBytes.length, offset)]);
};
