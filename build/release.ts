import { createHash } from 'node:crypto';
import { copyFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import pkg from '../package.json' with { type: 'json' };

import { buildThirdPartyNotices } from './notices.ts';
import { zipFolder } from './zipFolder.ts';

const ROOT = fileURLToPath(new URL('../', import.meta.url));

const DIST = join(ROOT, 'dist');

const EXTENSION_DIR = join(DIST, 'chrome-mv3');

const ARCHIVE_NAME = `interceptkit-${pkg.version}.zip`;

const packRelease = (): void => {
    copyFileSync(join(ROOT, 'LICENSE'), join(EXTENSION_DIR, 'LICENSE'));
    writeFileSync(join(EXTENSION_DIR, 'THIRD_PARTY_NOTICES.txt'), buildThirdPartyNotices());

    const archive = zipFolder(EXTENSION_DIR);
    const sha256 = createHash('sha256').update(archive).digest('hex');

    writeFileSync(join(DIST, ARCHIVE_NAME), archive);

    console.log(`dist/${ARCHIVE_NAME}: ${archive.length} bytes, SHA-256 ${sha256}`);
};

packRelease();
