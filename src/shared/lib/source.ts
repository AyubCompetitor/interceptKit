import { isPolicyId } from './identifier.ts';
import { oneOf } from './validation.ts';

export enum Sources {
    USER = 'user',
    POLICY = 'policy',
}

export type Source = `${Sources}`;

/** What a rule and a mock share: where they come from */
interface SourcedRecord {
    /** Id of the record */
    readonly id: string;
    /** Who made the record */
    readonly source: Source;
}

export const SOURCES = Object.values(Sources);

const SOURCE_ERRORS = {
    POLICY_ID: 'only records of the policy have ids that start with "policy:"',
} as const;

export const source = oneOf(SOURCES);

/** A record of the user can never stand in for a record of the policy */
export const getRecordIdError = (record: SourcedRecord): NotRequired<string> => {
    const isUserRecordWithPolicyId = record.source === Sources.USER && isPolicyId(record.id);

    if (!isUserRecordWithPolicyId) {
        return;
    }

    return SOURCE_ERRORS.POLICY_ID;
};
