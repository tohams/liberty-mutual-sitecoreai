import type { ReactNode } from "react";
import { PortalIcon } from "@/components/ui/portal-icon";

export function ProductSpotlightFrame({
  children,
  id,
  styles,
}: {
  children: ReactNode;
  id?: string;
  styles?: string;
}) {
  return (
    <section
      id={id}
      className={["products-hero", styles].filter(Boolean).join(" ")}
    >
      <div>{children}</div>
      <div className="products-hero-art" aria-hidden="true">
        <PortalIcon name="building" width="78" height="78" />
        <PortalIcon name="home" width="61" height="61" />
        <span className="product-art-sun" />
      </div>
    </section>
  );
}

/** Keep the current experience available before the CMS placement is published. */
export function ProductSpotlightFallback() {
  return (
    <ProductSpotlightFrame>
      <span className="eyebrow">LOCAL KNOWLEDGE. BROAD POSSIBILITIES.</span>
      <h2>
        Protection built around
        <br />
        the business you know.
      </h2>
      <p>
        From the first home to a growing enterprise, explore guidance, prepare
        your account, and connect with a specialist.
      </p>
    </ProductSpotlightFrame>
  );
}
