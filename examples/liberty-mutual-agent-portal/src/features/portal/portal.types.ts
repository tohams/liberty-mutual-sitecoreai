import type { ReactNode } from "react";
import type { PortalAction, PortalBootstrap } from "@/contracts/portal";

export type ActionInput = PortalAction extends infer Action
  ? Action extends PortalAction
    ? Omit<Action, "expectedVersion" | "runId" | "idempotencyKey">
    : never
  : never;
export interface PortalAppProps {
  initialData: PortalBootstrap;
  route: string;
  workspaceEditorial?: ReactNode;
  resourcesSearch?: ReactNode;
  productsSpotlight?: ReactNode;
  pageContent?: ReactNode;
  isEditing?: boolean;
}
export interface PortalContextValue {
  data: PortalBootstrap;
  busy: boolean;
  act: (
    action: ActionInput,
    successMessage?: string,
  ) => Promise<PortalBootstrap | null>;
  notify: (message: string) => void;
}
