import type { Metadata } from "next";
import { CustomerDemoGuide } from "@/features/workshops/customer-demo/CustomerDemoGuide";

export const metadata: Metadata = {
  title: "45-minute customer demonstration | Liberty Mutual + SitecoreAI",
  description:
    "The complete customer-requested demonstration sequence, with links to the separate public-site and Agent Portal guides.",
};

export default function CustomerDemoPage() {
  return <CustomerDemoGuide />;
}
