import { describe, expect, it } from '@rstest/core';

import { buildSectionHash, DashboardSections, parseDashboardSection } from '../dashboard.ts';

describe('parseDashboardSection', () => {
    it.each([
        { hash: '#sites', section: DashboardSections.SITES },
        { hash: '#settings', section: DashboardSections.SETTINGS },
        { hash: '', section: DashboardSections.RULES },
        { hash: '#unknown', section: DashboardSections.RULES },
    ])('reads "$hash" as $section', ({ hash, section }) => {
        expect(parseDashboardSection(hash)).toBe(section);
    });

    it('reads back the hash it builds', () => {
        const hash = buildSectionHash(DashboardSections.SETTINGS);

        expect(parseDashboardSection(hash)).toBe(DashboardSections.SETTINGS);
    });
});
