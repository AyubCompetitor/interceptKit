import { HttpMethods } from '#shared/lib';

import styles from './MethodLabel.module.css';

/** Colours of the methods after Postman; methods without one of their own share a muted colour */
const METHOD_TONES = new Map<string, NotRequired<string>>([
    [HttpMethods.GET, styles.get],
    [HttpMethods.POST, styles.post],
    [HttpMethods.PUT, styles.put],
    [HttpMethods.PATCH, styles.patch],
    [HttpMethods.DELETE, styles.delete],
]);

export const getMethodToneClass = (method: string): NotRequired<string> =>
    METHOD_TONES.get(method.toUpperCase()) ?? styles.other;
