"use client";
import { useState, useRef, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, LogOut, Maximize2, X } from "lucide-react";
import type { GuideImage } from "./types";

export function WorkshopSignOut() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <>
      <button
        type="button"
        className="workshop-signout"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const response = await fetch("/api/workshops/logout", {
              method: "POST",
            });
            if (!response.ok) throw new Error();
            router.replace("/workshops/login");
            router.refresh();
          } catch {
            setError("Sign-out failed. Please retry.");
            setBusy(false);
          }
        }}
      >
        <LogOut size={16} />
        <span>Sign out</span>
      </button>
      {error && <span role="alert">{error}</span>}
    </>
  );
}
export function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  return (
    <div className="workshop-code">
      <div>
        <span>Command / configuration</span>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(code);
              setCopied(true);
              setError(false);
              window.setTimeout(() => setCopied(false), 1800);
            } catch {
              setError(true);
            }
          }}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre>
        <code>{code}</code>
      </pre>
      {error && <p role="status">Select the command to copy it manually.</p>}
    </div>
  );
}
export function GuideScreenshot({ image }: { image: GuideImage }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const src = `/api/workshops/assets/${image.file}`;
  return (
    <figure className="workshop-figure">
      <button
        className="workshop-image-button"
        type="button"
        onClick={() => dialog.current?.showModal()}
        aria-label={`Enlarge screenshot: ${image.alt}`}
      >
        {/* These authenticated images must not pass through a shared image optimizer cache. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={image.alt} loading="lazy" />
        <span>
          <Maximize2 size={14} />
          Enlarge screenshot
        </span>
      </button>
      <figcaption>{image.caption}</figcaption>
      <dialog
        ref={dialog}
        className="workshop-lightbox"
        onClick={(event) => {
          if (event.target === dialog.current) dialog.current.close();
        }}
      >
        <div>
          <button
            autoFocus
            type="button"
            onClick={() => dialog.current?.close()}
            aria-label="Close enlarged screenshot"
          >
            <X size={22} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={image.alt} />
          <p>{image.caption}</p>
        </div>
      </dialog>
    </figure>
  );
}
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("workshop-progress", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("workshop-progress", callback);
  };
}
function readProgress(key: string) {
  try {
    return window.localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}
function decodeProgress(value: string): number[] {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed)
      ? parsed.filter((n) => Number.isInteger(n) && n >= 0)
      : [];
  } catch {
    return [];
  }
}
export function GuideProgress({
  username,
  slug,
  total,
  step,
}: {
  username: string;
  slug: string;
  total: number;
  step?: number;
}) {
  const key = `lm-workshop:v1:${username}:${slug}`;
  const raw = useSyncExternalStore(
    subscribe,
    () => readProgress(key),
    () => "",
  );
  const complete = decodeProgress(raw).filter((n) => n < total);
  function save(next: number[]) {
    try {
      window.localStorage.setItem(key, JSON.stringify(next));
      window.dispatchEvent(new Event("workshop-progress"));
    } catch {
      /* Browsing and the instructions remain available without local storage. */
    }
  }
  if (step !== undefined)
    return (
      <label className="workshop-step-check">
        <input
          type="checkbox"
          checked={complete.includes(step)}
          onChange={(event) =>
            save(
              event.target.checked
                ? [...new Set([...complete, step])]
                : complete.filter((n) => n !== step),
            )
          }
        />
        <span>Step complete</span>
      </label>
    );
  return (
    <div className="workshop-progress">
      <div>
        <strong>
          {complete.length} of {total} steps
        </strong>
        <span>{Math.round((complete.length / total) * 100)}%</span>
      </div>
      <progress
        max={total}
        value={complete.length}
        aria-label="Walkthrough progress"
      />
      <p>Checkmarks are saved in this browser.</p>
      {complete.length > 0 && (
        <button type="button" onClick={() => save([])}>
          Clear checkmarks
        </button>
      )}
    </div>
  );
}
