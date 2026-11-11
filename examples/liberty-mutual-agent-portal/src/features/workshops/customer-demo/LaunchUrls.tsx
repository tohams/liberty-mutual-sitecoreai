import type { GuideLink } from "../types";
import { Link2 } from "lucide-react";
import { CopyValue } from "./CopyValue";
import styles from "./CustomerDemo.module.css";

export function LaunchUrls({ links }: { links: GuideLink[] }) {
  if (!links.length) return null;
  return (
    <aside
      className={`${styles.cueBox} ${styles.copyCue}`}
      aria-label="Copy URL"
      data-demo-cue="url"
    >
      <h4 className={styles.cueLabel}>
        <Link2 size={15} aria-hidden="true" /> Copy URL
      </h4>
      <div className={styles.launchUrls}>
        {links.map((link) => (
          <CopyValue
            key={link.href}
            label={link.label}
            value={link.href}
            format="url"
          />
        ))}
      </div>
    </aside>
  );
}
