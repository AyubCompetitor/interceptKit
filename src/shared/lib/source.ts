import { oneOf } from './validation.ts';

export enum Sources {
    USER = 'user',
    POLICY = 'policy',
}

export type Source = `${Sources}`;

export const SOURCES = Object.values(Sources);

export const source = oneOf(SOURCES);
