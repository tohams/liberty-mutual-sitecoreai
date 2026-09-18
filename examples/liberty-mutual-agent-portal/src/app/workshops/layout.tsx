import type { Metadata } from "next";
import "@/styles/workshops.css";
export const metadata: Metadata = {
  title: "Workshop guide | Liberty Mutual + SitecoreAI",
  description:
    "Guided exploration of the Liberty Mutual agent experience and SitecoreAI implementation.",
  robots: { index: false, follow: false, noarchive: true },
};
export const dynamic = "force-dynamic";
export default function WorkshopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
