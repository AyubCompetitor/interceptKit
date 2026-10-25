import { useState } from 'react';

import type { ApiRequest } from '#entities/request';

export const useCurlExportDialog = () => {
    const [exportedRequest, setExportedRequest] = useState<ApiRequest>();

    const onExportOpen = (request: ApiRequest) => setExportedRequest(request);

    const onExportClose = () => setExportedRequest(undefined);

    return {
        exportedRequest,
        onExportOpen,
        onExportClose,
    };
};
