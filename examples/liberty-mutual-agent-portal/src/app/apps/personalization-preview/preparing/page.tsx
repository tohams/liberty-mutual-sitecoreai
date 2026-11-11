import type { Metadata } from "next";
import { LoaderCircle } from "lucide-react";
import styles from "@/features/personalization-preview/PersonalizationPreviewPreparing.module.css";

export const metadata: Metadata = {
  title: "Preparing your preview",
  robots: { index: false, follow: false },
};

export default function PersonalizationPreviewPreparingPage() {
  return (
    <main className={styles.page}>
      <div className={styles.content} role="status">
        <span className={styles.icon} aria-hidden="true">
          <LoaderCircle size={28} className={styles.spinner} />
        </span>
        <p className={styles.eyebrow}>Personalization Preview</p>
        <h1>Preparing your page</h1>
        <p>Your selected variants will appear here shortly.</p>
      </div>
    </main>
  );
}
