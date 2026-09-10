"use client";
import { useContext, useEffect, useId, useRef } from "react";
import { PortalIcon } from "./portal-icon";
import type { PortalDialogProps } from "./portal-dialog.props";
import { PortalNoticeContext } from "./portal-notice-context";

export function PortalDialog({
  title,
  eyebrow,
  open,
  onClose,
  children,
  wide,
}: PortalDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const notice = useContext(PortalNoticeContext);
  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog?.open) dialog?.showModal();
    if (!open && dialog?.open) dialog.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className={`portal-dialog ${wide ? "portal-dialog-wide" : ""}`}
      aria-labelledby={titleId}
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <header className="dialog-header">
        <div>
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h2 id={titleId}>{title}</h2>
        </div>
        <button
          type="button"
          className="icon-button"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <PortalIcon name="close" />
        </button>
      </header>
      <div className="dialog-body">
        {open && notice && (
          <p
            className={`dialog-notice ${notice.error ? "is-error" : ""}`}
            role={notice.error ? "alert" : "status"}
          >
            <PortalIcon name={notice.error ? "info" : "check"} width="17" />
            {notice.message}
          </p>
        )}
        {children}
      </div>
    </dialog>
  );
}
