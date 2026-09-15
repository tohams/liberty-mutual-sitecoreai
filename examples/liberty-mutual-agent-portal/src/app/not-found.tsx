import { PortalLink as Link } from "@/components/ui/portal-link";
import Image from "next/image";
export default function NotFound() {
  return (
    <main className="portal-status-page">
      <Image
        src="/brand/liberty-mutual-horizontal.svg"
        width={180}
        height={46}
        alt="Liberty Mutual"
      />
      <h1>Let’s get you back on track.</h1>
      <p>This page is unavailable or has moved.</p>
      <Link href="/">Open your workspace</Link>
    </main>
  );
}
