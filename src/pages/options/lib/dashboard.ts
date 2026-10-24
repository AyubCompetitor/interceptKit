import { oneOf, validate } from '#shared/lib';

export enum DashboardSections {
    RULES = 'rules',
    MOCKS = 'mocks',
    SITES = 'sites',
    TRANSFER = 'transfer',
    SETTINGS = 'settings',
}

export type DashboardSection = `${DashboardSections}`;

const HASH_PREFIX = '#';

const HASH_CHANGE_EVENT = 'hashchange';

const dashboardSection = oneOf(Object.values(DashboardSections));

const isDashboardSection = (value: string): value is DashboardSection => validate(dashboardSection, value).ok;

export const getHash = (): string => location.hash;

export const watchHashChange = (onHashChange: VoidFunction): VoidFunction => {
    window.addEventListener(HASH_CHANGE_EVENT, onHashChange);

    return () => window.removeEventListener(HASH_CHANGE_EVENT, onHashChange);
};

export const parseDashboardSection = (hash: string): DashboardSection => {
    const value = hash.replace(HASH_PREFIX, '');

    if (isDashboardSection(value)) {
        return value;
    }

    return DashboardSections.RULES;
};

export const buildSectionHash = (section: DashboardSection): string => `${HASH_PREFIX}${section}`;
