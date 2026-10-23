import { interceptFetch } from './interceptFetch.ts';
import { interceptXhr } from './interceptXhr.ts';
import { startMockList } from './mockList.ts';

export const startInterceptor: VoidFunction = () => {
    startMockList();

    interceptFetch();
    interceptXhr();
};
