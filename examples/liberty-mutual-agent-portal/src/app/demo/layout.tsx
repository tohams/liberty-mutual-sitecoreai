import type { Metadata } from "next";
import "@/styles/workshops.css";

export const metadata: Metadata = {
  robots: { index: false, follow: false, noarchive: true },
};
export const dynamic = "force-dynamic";

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
