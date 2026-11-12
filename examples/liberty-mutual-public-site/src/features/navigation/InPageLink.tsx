"use client";

import { Link } from "@sitecore-content-sdk/nextjs";
import type { ComponentProps } from "react";

const browserNavigation = /^$/;

/** Native browser anchors replace an existing FAQ fragment during in-page jumps. */
export default function InPageLink(props: ComponentProps<typeof Link>) {
  return <Link {...props} internalLinkMatcher={browserNavigation} />;
}
