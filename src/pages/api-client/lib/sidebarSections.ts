/** Parts of the sidebar, one on the screen at a time */
export enum SidebarSections {
    HISTORY = 'history',
    ENVIRONMENTS = 'environments',
}

export type SidebarSection = `${SidebarSections}`;
