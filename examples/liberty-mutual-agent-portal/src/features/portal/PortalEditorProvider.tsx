"use client";

import { useMemo, type ReactNode } from "react";
import type { PortalBootstrap } from "@/contracts/portal";
import { PortalContext } from "./portal-context";
import { createReadonlyEditorContext } from "./portal-editor-state";

/** Supplies component previews without mounting agent navigation, state writes, or tracking. */
export function PortalEditorProvider({
  data,
  children,
}: {
  data: PortalBootstrap;
  children: ReactNode;
}) {
  const context = useMemo(() => createReadonlyEditorContext(data), [data]);
  return (
    <PortalContext.Provider value={context}>{children}</PortalContext.Provider>
  );
}
