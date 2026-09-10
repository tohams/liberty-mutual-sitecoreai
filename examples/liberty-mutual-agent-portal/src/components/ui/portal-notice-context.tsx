"use client";
import { createContext } from "react";

/** Mirrors operation feedback inside native modal dialogs, whose background is inert. */
export const PortalNoticeContext = createContext<{
  message: string;
  error?: boolean;
} | null>(null);
