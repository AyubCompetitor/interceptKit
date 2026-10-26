import type { Extension } from '@codemirror/state';
import { Decoration, MatchDecorator, ViewPlugin, type DecorationSet, type ViewUpdate } from '@codemirror/view';

export const TEMPLATE_CLASS = 'cm-template';

const TEMPLATE_MATCHER = new MatchDecorator({
    regexp: /\{\{[^{}]*\}\}/g,
    decoration: Decoration.mark({ class: TEMPLATE_CLASS }),
});

interface TemplateHighlight {
    /** {{templates}} of the visible text */
    decorations: DecorationSet;
    /** Follows every change of the text and of the viewport */
    update: (update: ViewUpdate) => void;
}

export const templateHighlight: Extension = ViewPlugin.define(
    (view): TemplateHighlight => {
        const plugin: TemplateHighlight = {
            decorations: TEMPLATE_MATCHER.createDeco(view),
            update: update => {
                plugin.decorations = TEMPLATE_MATCHER.updateDeco(update, plugin.decorations);
            },
        };

        return plugin;
    },
    { decorations: plugin => plugin.decorations },
);
