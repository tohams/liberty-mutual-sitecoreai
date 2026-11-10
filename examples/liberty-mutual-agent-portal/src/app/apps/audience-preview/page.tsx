import type { Metadata } from "next";
import { AudiencePreviewMarketplace } from "@/features/audience-preview/AudiencePreviewMarketplace";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Audience Preview",
  robots: { index: false, follow: false },
};

export default function AudiencePreviewApp() {
  return <AudiencePreviewMarketplace />;
}
