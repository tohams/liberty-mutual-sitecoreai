"use client";
import { useState, useRef, useId } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, LogOut, Maximize2, X } from "lucide-react";
import { GuideText } from "./GuideText";
import type { GuideImage } from "./types";
import {
  guideCropGeometry,
  guideImageAssetUrl,
  validImageAnnotation,
} from "./guide-images";

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
function ScreenshotCanvas({ image }: { image: GuideImage }) {
  const crop = image.crop ? guideCropGeometry(image.crop) : null;
  const annotations = image.annotations?.filter(validImageAnnotation) ?? [];
  return (
    <span className="workshop-screenshot-canvas">
      <span
        className={`workshop-screenshot-viewport${crop ? " is-cropped" : ""}`}
        style={crop ? { aspectRatio: crop.aspectRatio } : undefined}
      >
        {/* Authenticated images bypass the shared image optimizer cache. Crops use CSS only. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={guideImageAssetUrl(image.file)}
          alt={image.alt}
          loading="lazy"
          style={crop?.image}
        />
      </span>
      <span className="workshop-screenshot-overlay" aria-hidden="true">
        {annotations.map((annotation, index) => (
          <span className="workshop-screenshot-highlight" key={index}>
            <span
              className="workshop-screenshot-box"
              style={{
                left: `${annotation.x}%`,
                top: `${annotation.y}%`,
                width: `${annotation.width}%`,
                height: `${annotation.height}%`,
              }}
            />
            <span
              className="workshop-screenshot-number"
              style={{
                left: `clamp(15px, ${annotation.x}%, calc(100% - 15px))`,
                top: `clamp(15px, ${annotation.y}%, calc(100% - 15px))`,
              }}
            >
              {index + 1}
            </span>
          </span>
        ))}
      </span>
    </span>
  );
}

function ScreenshotDetails({ image }: { image: GuideImage }) {
  const annotations = image.annotations?.filter(validImageAnnotation) ?? [];
  return (
    <>
      <p className="workshop-screenshot-caption">
        <GuideText text={image.caption} />
      </p>
      {annotations.length > 0 && (
        <ol
          className="workshop-screenshot-legend"
          aria-label="Numbered screenshot highlights"
        >
          {annotations.map((annotation, index) => (
            <li key={index}>
              <span className="workshop-legend-number" aria-hidden="true">
                {index + 1}
              </span>
              <span>
                <span className="sr-only">Highlight {index + 1}: </span>
                <GuideText text={annotation.label} />
              </span>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}

export function GuideScreenshot({ image }: { image: GuideImage }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  return (
    <figure className="workshop-figure">
      {image.title && (
        <h3 className="workshop-screenshot-title">
          <GuideText text={image.title} />
        </h3>
      )}
      <button
        className="workshop-image-button"
        style={
          image.crop
            ? { maxWidth: Math.max(320, image.crop.width * 1.5) }
            : undefined
        }
        type="button"
        onClick={() => dialog.current?.showModal()}
        aria-label={`Enlarge screenshot: ${image.alt}`}
        aria-describedby={`${id}-caption`}
      >
        <ScreenshotCanvas image={image} />
        <span className="workshop-image-enlarge">
          <Maximize2 size={14} />
          Enlarge image and highlights
        </span>
      </button>
      <figcaption id={`${id}-caption`}>
        <ScreenshotDetails image={image} />
      </figcaption>
      <dialog
        ref={dialog}
        className="workshop-lightbox"
        style={
          image.crop
            ? {
                width: `min(${Math.min(1440, Math.max(520, image.crop.width * 1.7 + 40))}px, calc(${(image.crop.width / image.crop.height) * 60}vh + 40px))`,
              }
            : undefined
        }
        aria-labelledby={`${id}-dialog-title`}
        onClick={(event) => {
          if (event.target === dialog.current) dialog.current.close();
        }}
      >
        <div>
          <h2 id={`${id}-dialog-title`} className="workshop-lightbox-title">
            <GuideText text={image.title ?? "Screenshot details"} />
          </h2>
          <button
            className="workshop-lightbox-close"
            autoFocus
            type="button"
            onClick={() => dialog.current?.close()}
            aria-label="Close enlarged screenshot"
          >
            <X size={22} />
          </button>
          <ScreenshotCanvas image={image} />
          <ScreenshotDetails image={image} />
        </div>
      </dialog>
    </figure>
  );
}
