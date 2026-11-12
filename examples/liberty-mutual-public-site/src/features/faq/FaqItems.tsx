"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Preserve native accordions while opening the exact answer addressed by Search. */
export default function FaqItems({ children }: { children: ReactNode }) {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const showAddressedAnswer = () => {
      const id = window.location.hash.slice(1);
      if (!id.startsWith("faq-")) return;
      const details = document.getElementById(id);
      if (
        !(details instanceof HTMLDetailsElement) ||
        !container.current?.contains(details)
      )
        return;
      details.open = true;
      details.scrollIntoView({ block: "start" });
    };
    showAddressedAnswer();
    window.addEventListener("hashchange", showAddressedAnswer);
    return () => window.removeEventListener("hashchange", showAddressedAnswer);
  }, []);
  return (
    <div className="public-faq__items" ref={container}>
      {children}
    </div>
  );
}
