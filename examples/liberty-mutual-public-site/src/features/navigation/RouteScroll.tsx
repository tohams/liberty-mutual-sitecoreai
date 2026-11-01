"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { shouldResetRouteScroll } from "./route-scroll";

/** Native layout elements persist across routes, so a new destination needs an explicit scroll origin. */
export default function RouteScroll() {
  const pathname = usePathname();
  const previousPath = useRef(pathname);
  const restoredPath = useRef<string | null>(null);

  useEffect(() => {
    const restore = () => {
      restoredPath.current = window.location.pathname;
    };
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, []);

  useLayoutEffect(() => {
    if (previousPath.current === pathname) return;
    const reset = shouldResetRouteScroll(
      previousPath.current,
      pathname,
      window.location.hash,
      restoredPath.current,
    );
    previousPath.current = pathname;
    restoredPath.current = null;
    if (reset && window.self === window.top) {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  }, [pathname]);

  return null;
}
