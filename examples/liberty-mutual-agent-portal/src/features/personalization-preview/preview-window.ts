import {
  isPersonalizationPreviewResult,
  type PersonalizationPreviewResult,
} from "./types";

export const PERSONALIZATION_PREVIEW_PREPARING_PATH =
  "/apps/personalization-preview/preparing";

interface PreviewWindow {
  readonly closed: boolean;
  location: { replace: (url: string) => void };
  opener: unknown;
  close: () => void;
  focus: () => void;
}

export interface PersonalizationPreviewLaunch {
  readonly id: number;
}

/** Reserve a tab during the click; async preparation must not open a popup. */
export class PersonalizationPreviewLauncher {
  private sequence = 0;
  private current: {
    attempt: PersonalizationPreviewLaunch;
    window: PreviewWindow | null;
    pending: boolean;
  } | null = null;

  constructor(
    private readonly origin: () => string,
    private readonly open: (url: string) => PreviewWindow | null,
  ) {}

  start(): PersonalizationPreviewLaunch {
    this.cancel();
    const attempt = { id: ++this.sequence };
    let opened: PreviewWindow | null = null;
    try {
      opened = this.open(
        new URL(PERSONALIZATION_PREVIEW_PREPARING_PATH, this.origin()).href,
      );
    } catch {
      // Browser popup restrictions have the same recovery as a null result.
      opened = null;
    }
    try {
      // The preview never needs access to its Page Builder opener.
      if (opened) opened.opener = null;
    } catch {
      // A restricted WindowProxy may disallow this write without blocking navigation.
    }
    this.current = { attempt, window: opened, pending: true };
    return attempt;
  }

  isCurrent(attempt: PersonalizationPreviewLaunch): boolean {
    return this.current?.attempt === attempt;
  }

  complete(
    attempt: PersonalizationPreviewLaunch,
    result: PersonalizationPreviewResult,
  ): "opened" | "blocked" | null {
    if (!this.isCurrent(attempt) || !this.current?.pending) return null;
    if (!isPersonalizationPreviewResult(result, this.origin())) {
      this.closePending();
      throw new Error("The preview could not be opened. Please try again.");
    }
    const current = this.current;
    const opened = current.window;
    if (!opened || opened.closed) {
      current.pending = false;
      return "blocked";
    }
    try {
      opened.location.replace(new URL(result.previewUrl, this.origin()).href);
      current.pending = false;
    } catch {
      this.closePending();
      return "blocked";
    }
    try {
      opened.focus();
    } catch {
      // Some browsers disallow asynchronous focus after a successful navigation.
    }
    return "opened";
  }

  /** Close only an unfinished tab. A completed preview remains available. */
  cancel(attempt?: PersonalizationPreviewLaunch): void {
    if (attempt && !this.isCurrent(attempt)) return;
    this.closePending();
    this.current = null;
  }

  private closePending(): void {
    const current = this.current;
    if (current?.pending && current.window && !current.window.closed) {
      try {
        current.window.close();
      } catch {
        // A manually closed or detached browser window needs no cleanup.
      }
    }
    if (current) {
      current.pending = false;
      current.window = null;
    }
  }
}

/** React cleanup alone does not run when the containing document navigates. */
export function watchPersonalizationPreviewPageExit(
  target: Pick<EventTarget, "addEventListener" | "removeEventListener">,
  launcher: Pick<PersonalizationPreviewLauncher, "cancel">,
): () => void {
  const closePending = () => launcher.cancel();
  target.addEventListener("pagehide", closePending);
  return () => {
    target.removeEventListener("pagehide", closePending);
    closePending();
  };
}
