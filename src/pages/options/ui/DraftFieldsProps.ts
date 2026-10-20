import type { RuleDraft, RuleDraftChange } from '../model/ruleDraft.ts';

/** Props of a group of fields in the rule form */
export interface DraftFieldsProps {
    /** Current form state */
    draft: RuleDraft;
    /** Merges changed fields into the form state */
    onDraftChange: RuleDraftChange;
}
