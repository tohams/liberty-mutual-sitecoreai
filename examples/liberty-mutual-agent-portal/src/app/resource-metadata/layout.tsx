import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Resource metadata | SitecoreAI" },
  description: "Managed metadata choices for Liberty Mutual resource authors.",
  icons: { icon: "/marketplace/resource-metadata-icon.svg" },
  robots: { index: false, follow: false },
  referrer: "same-origin",
};

export default function ResourceMetadataLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
