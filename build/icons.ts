import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

/** One PNG of the extension icon */
interface IconSpec {
    /** Where the PNG goes, from the root of the project */
    readonly path: string;
    /** Width and height in pixels */
    readonly size: number;
    /** Transparent border on each side */
    readonly padding: number;
    /** Line width of the glyph, in units of its 20 × 20 box: small sizes need bolder lines */
    readonly strokeWidth: number;
}

/** The brand glyph: IconNames.BRAND of shared/ui/Icon, drawn in a 20 × 20 box */
const BRAND_GLYPH = 'M3 13.5h4.5c3 0 3.5-7 7-7H17M14.5 4l2.5 2.5L14.5 9M7.5 13.5H17';

const ROOT = fileURLToPath(new URL('../', import.meta.url));

/** The store wants 96 of the 128 pixels drawn and the rest transparent; the small sizes fill their square */
const ICONS: readonly IconSpec[] = [
    { path: 'public/icons/icon-16.png', size: 16, padding: 0, strokeWidth: 2.25 },
    { path: 'public/icons/icon-32.png', size: 32, padding: 0, strokeWidth: 2 },
    { path: 'public/icons/icon-48.png', size: 48, padding: 2, strokeWidth: 1.75 },
    { path: 'public/icons/icon-128.png', size: 128, padding: 16, strokeWidth: 1.75 },
    { path: 'store/images/edge-logo.png', size: 300, padding: 0, strokeWidth: 1.75 },
];

const COLORS = {
    TILE: '#1f1f1f',
    GLYPH: '#f2f2f2',
} as const;

const GLYPH_BOX = 20;

const GLYPH_SHARE = 0.7;

const CORNER_SHARE = 0.22;

const GLYPH_SHIFT = 1.25;

const PAGE_STYLE = '<style>html, body { margin: 0; background: transparent; }</style>';

const buildIconSvg = ({ size, padding, strokeWidth }: IconSpec): string => {
    const tile = size - padding * 2;
    const glyph = tile * GLYPH_SHARE;
    const offset = padding + (tile - glyph) / 2;
    const scale = glyph / GLYPH_BOX;

    return [
        `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`,
        `<rect x="${padding}" y="${padding}" width="${tile}" height="${tile}" rx="${tile * CORNER_SHARE}" fill="${COLORS.TILE}"/>`,
        `<g transform="translate(${offset} ${offset}) scale(${scale}) translate(0 ${GLYPH_SHIFT})"`,
        ` fill="none" stroke="${COLORS.GLYPH}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">`,
        `<path d="${BRAND_GLYPH}"/></g></svg>`,
    ].join('');
};

const renderIcons = async (): Promise<void> => {
    const browser = await chromium.launch({ channel: 'chromium' });

    for (const icon of ICONS) {
        const path = join(ROOT, icon.path);
        const page = await browser.newPage({ viewport: { width: icon.size, height: icon.size }, deviceScaleFactor: 1 });

        mkdirSync(dirname(path), { recursive: true });

        await page.setContent(`${PAGE_STYLE}${buildIconSvg(icon)}`);
        await page.screenshot({ path, omitBackground: true });
        await page.close();
    }

    await browser.close();
};

await renderIcons();
