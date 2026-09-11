"use client";

import NextLink from "next/link";
import { Link as SitecoreLink } from "@sitecore-content-sdk/nextjs";
import type { ComponentProps } from "react";

type PortalLinkProps = Omit<ComponentProps<typeof NextLink>, "prefetch">;
type PortalContentLinkProps = Omit<ComponentProps<typeof SitecoreLink>, "prefetch">;

/** Native personalization and experiments must execute on visits, never speculative navigation. */
export function PortalLink(props: PortalLinkProps) {
  return <NextLink {...props} prefetch={false} />;
}

/** Keep authored fields, editing metadata and SDK link behavior under the same navigation policy. */
export function PortalContentLink(props: PortalContentLinkProps) {
  return <SitecoreLink {...props} prefetch={false} />;
}
