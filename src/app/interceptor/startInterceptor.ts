import { interceptFetch } from './interceptFetch.ts';
import { interceptXhr } from './interceptXhr.ts';
import { startMockList } from './mockList.ts';

/** Runs in the page's main world before its scripts: from here on fetch and XHR answer with mocks */
export const startInterceptor: VoidFunction = () => {
    startMockList();

    interceptFetch();
    interceptXhr();
};
