"use client";

import { createContext, useContext } from "react";
import type { PortalContextValue } from "./portal.types";

export const PortalContext = createContext<PortalContextValue | null>(null);
export function usePortal() {
  const context = useContext(PortalContext);
  if (!context) throw new Error("Portal features require PortalContext.");
  return context;
}
export const money = (cents: number, compact = false) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 2 : 0,
  }).format(cents / 100);
export const dateLabel = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
export const stateNames = { TX: "Texas", FL: "Florida", IL: "Illinois" };
export const lineNames = {
  personal: "Personal lines",
  "small-commercial": "Small business",
  commercial: "Commercial",
  specialty: "Specialty",
  surety: "Surety",
};
