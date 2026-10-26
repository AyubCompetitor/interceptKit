/** One action of a menu */
export interface MenuAction {
    /** Text of the action */
    readonly label: string;
    /** Called when the action is chosen; the menu closes first */
    readonly onSelect: VoidFunction;
}
