import type { GuideLink } from "../types";
import { CopyValue } from "./CopyValue";
import styles from "./CustomerDemo.module.css";

export function LaunchUrls({ links }: { links: GuideLink[] }) {
  if (!links.length) return null;
  return (
    <div className={styles.launchUrls} aria-label="Launch URLs">
      <p className={styles.launchTitle}>Launch URLs</p>
      {links.map((link) => (
        <CopyValue
          key={link.href}
          label={link.label}
          value={link.href}
          format="url"
        />
      ))}
    </div>
  );
}
