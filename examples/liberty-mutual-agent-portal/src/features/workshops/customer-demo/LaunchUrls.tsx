import type { GuideLink } from "../types";
import { CopyValue } from "./CopyValue";
import styles from "./CustomerDemo.module.css";

export function LaunchUrls({ links }: { links: GuideLink[] }) {
  if (!links.length) return null;
  return (
    <div className={styles.launchUrls} aria-label="Start here">
      <p className={styles.launchTitle}>Start here</p>
      <p className={styles.launchTitle}>
        Reuse an open tab, or copy the starting URL once. Follow the numbered
        clicks below.
      </p>
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
