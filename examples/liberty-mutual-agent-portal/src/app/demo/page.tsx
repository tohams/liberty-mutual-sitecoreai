import type { Metadata } from "next";
import { CustomerDemoGuide } from "@/features/workshops/customer-demo/CustomerDemoGuide";

export const metadata: Metadata = {
  title: "Agent Portal demonstration | Liberty Mutual + SitecoreAI",
  description:
    "Customer-requested demonstration steps, talk tracks, and highlighted screenshots.",
};

export default function DemoPage() {
  return <CustomerDemoGuide chapterId="portal" />;
}
