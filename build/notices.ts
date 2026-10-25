import { execSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

interface LicensedPackage {
    /** Package name */
    readonly name: string;
    /** Versions in the build */
    readonly versions: readonly string[];
    /** Folders of those versions in node_modules */
    readonly paths: readonly string[];
    /** SPDX id of the license */
    readonly license: string;
}

type LicenseList = Readonly<Record<string, readonly LicensedPackage[]>>;

const LICENSE_FILE_RGX = /^(licen[cs]e|copying)(\.(md|txt))?$/i;

const SEPARATOR = `\n\n${'-'.repeat(80)}\n\n`;

const HEADER =
    'InterceptKit includes the following third-party software, each under the license that follows its name.';

const MISSING_TEXT = 'The package ships no license file; see its page on npm.';

const readLicenseText = (packagePath: string): string => {
    const fileName = readdirSync(packagePath).find(name => LICENSE_FILE_RGX.test(name));

    if (fileName === undefined) {
        return MISSING_TEXT;
    }

    return readFileSync(join(packagePath, fileName), 'utf8').trim();
};

const formatPackage = (item: LicensedPackage): string => {
    const [path = ''] = item.paths;

    return `${item.name} ${item.versions.join(', ')} (${item.license})\n\n${readLicenseText(path)}`;
};

export const buildThirdPartyNotices = (): string => {
    const list: LicenseList = JSON.parse(execSync('pnpm licenses list --prod --json', { encoding: 'utf8' }));
    const packages = Object.values(list).flat();
    const sorted = packages.toSorted((first, second) => first.name.localeCompare(second.name));

    return `${HEADER}${SEPARATOR}${sorted.map(formatPackage).join(SEPARATOR)}\n`;
};
