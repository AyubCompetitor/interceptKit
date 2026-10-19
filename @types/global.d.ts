import type { FunctionComponent, PropsWithChildren } from 'react';

declare global {
    export type Nullable<T> = T | null;
    export type NotRequired<T> = T | undefined;
    export type FCC<P = {}> = FunctionComponent<PropsWithChildren<P>>;
}
