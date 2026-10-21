import styles from './Badge.module.css';

/** A short neutral label, such as the action of a rule */
export const Badge: FCC = ({ children }) => <span className={styles.badge}>{children}</span>;
