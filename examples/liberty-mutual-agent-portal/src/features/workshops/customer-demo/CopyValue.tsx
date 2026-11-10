"use client";

import { useId, useState } from "react";
import { Check, Copy } from "lucide-react";
import styles from "./CustomerDemo.module.css";

/** Copies only the supplied field value, without its label or formatting. */
export function CopyValue({
  label,
  value,
  format = "text",
}: {
  label: string;
  value: string;
  format?: "text" | "url";
}) {
  const valueId = useId();
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
  const actionLabel = format === "url" ? "Copy URL" : "Copy";

  async function copyValue() {
    try {
      await navigator.clipboard.writeText(value);
      setStatus("copied");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className={styles.copyValue}>
      <span className={styles.copyLabel}>{label}</span>
      <div className={styles.copyRow}>
        <span
          id={valueId}
          className={`${styles.copyText} ${format === "url" ? styles.copyUrl : ""}`}
        >
          {value}
        </span>
        <button
          type="button"
          className={styles.copyButton}
          aria-label={`${status === "copied" ? "Copied" : actionLabel} ${label}`}
          aria-describedby={valueId}
          onClick={copyValue}
          onBlur={() =>
            setStatus((current) => (current === "copied" ? "idle" : current))
          }
        >
          {status === "copied" ? (
            <Check size={15} aria-hidden="true" />
          ) : (
            <Copy size={15} aria-hidden="true" />
          )}
          {status === "copied" ? "Copied" : actionLabel}
        </button>
      </div>
      <span
        role="status"
        className={status === "error" ? styles.copyError : styles.copyStatus}
      >
        {status === "copied"
          ? `${label} copied.`
          : status === "error"
            ? "Clipboard access is unavailable. Select the text and copy it manually."
            : ""}
      </span>
    </div>
  );
}
