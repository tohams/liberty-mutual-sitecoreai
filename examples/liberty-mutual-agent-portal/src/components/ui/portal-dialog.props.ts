import type { ReactNode } from "react";
export interface PortalDialogProps {
  title: string;
  eyebrow?: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}
