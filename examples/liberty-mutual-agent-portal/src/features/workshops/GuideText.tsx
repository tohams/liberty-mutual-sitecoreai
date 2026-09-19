import { Fragment } from "react";
import Link from "next/link";
import { guideTextParts, type GuideEmphasisPart } from "./guide-text";

function Emphasis({ parts }: { parts: GuideEmphasisPart[] }) {
  return parts.map((part, index) =>
    part.kind === "strong" ? (
      <strong className="workshop-named-entity" key={index}>
        {part.text}
      </strong>
    ) : (
      <Fragment key={index}>{part.text}</Fragment>
    ),
  );
}

/** React escapes all labels. Disable links when the surrounding element is already a link. */
export function GuideText({
  text,
  linksEnabled = true,
}: {
  text: string;
  linksEnabled?: boolean;
}) {
  return guideTextParts(text).map((part, index) => {
    if (part.kind !== "link") return <Emphasis key={index} parts={[part]} />;
    const label = <Emphasis parts={part.children} />;
    if (!linksEnabled) return <Fragment key={index}>{label}</Fragment>;
    if (part.href.startsWith("/") || part.href.startsWith("#")) {
      return (
        <Link className="workshop-inline-link" href={part.href} key={index}>
          {label}
        </Link>
      );
    }
    return (
      <a
        className="workshop-inline-link"
        href={part.href}
        target="_blank"
        rel="noopener noreferrer"
        key={index}
      >
        {label}
      </a>
    );
  });
}
