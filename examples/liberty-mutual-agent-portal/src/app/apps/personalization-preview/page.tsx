import type { Metadata } from "next";
import { PersonalizationPreviewMarketplace } from "@/features/personalization-preview/PersonalizationPreviewMarketplace";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Personalization Preview",
  robots: { index: false, follow: false },
};

export default function PersonalizationPreviewApp() {
  return <PersonalizationPreviewMarketplace />;
}
