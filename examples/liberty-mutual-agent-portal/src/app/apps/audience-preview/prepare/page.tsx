import type { Metadata } from "next";
import { AudiencePreparation } from "@/features/audience-preview/AudiencePreparation";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Prepare audiences | Audience Preview",
  robots: { index: false, follow: false },
};
export default function AudiencePreparationPage() {
  return <AudiencePreparation />;
}
