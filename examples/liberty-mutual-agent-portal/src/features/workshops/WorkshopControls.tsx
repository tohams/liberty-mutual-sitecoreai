"use client";
import { useState, useRef } from "react";
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
