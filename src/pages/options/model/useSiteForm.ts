import { useState, type ChangeEvent, type SubmitEvent } from 'react';

import { buildHostPattern, parseHost } from '#entities/site';
import type { MessageKey } from '#shared/i18n';
import { requestHostAccess } from '#shared/platform';

const SITE_FORM_ERRORS = {
    INVALID_DOMAIN: 'sitesInvalidDomain',
    NOT_GRANTED: 'sitesNotGranted',
    REQUEST_FAILED: 'sitesRequestFailed',
} as const satisfies Record<string, MessageKey>;

export const useSiteForm = () => {
    const [domain, setDomain] = useState('');
    const [isWithSubdomains, setIsWithSubdomains] = useState(true);
    const [errorKey, setErrorKey] = useState<NotRequired<MessageKey>>();

    const onApplyAccess = (isGranted: boolean) => {
        if (!isGranted) {
            setErrorKey(SITE_FORM_ERRORS.NOT_GRANTED);

            return;
        }

        setDomain('');
        setErrorKey(undefined);
    };

    const onDomainChange = (event: ChangeEvent<HTMLInputElement>) => {
        setDomain(event.target.value);
    };

    const onSubdomainsChange = (event: ChangeEvent<HTMLInputElement>) => {
        setIsWithSubdomains(event.target.checked);
    };

    const onSiteAdd = (event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();

        const host = parseHost(domain);

        if (host === undefined) {
            setErrorKey(SITE_FORM_ERRORS.INVALID_DOMAIN);
            return;
        }

        const pattern = buildHostPattern(host, isWithSubdomains);

        requestHostAccess(pattern)
            .then(onApplyAccess)
            .catch(() => setErrorKey(SITE_FORM_ERRORS.REQUEST_FAILED));
    };

    return {
        domain,
        errorKey,
        isWithSubdomains,

        onDomainChange,
        onSubdomainsChange,
        onSiteAdd,
    };
};
