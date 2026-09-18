import { Fragment } from "react";
import { guideTextParts } from "./guide-text";

/** React escapes every segment. This deliberately does not interpret HTML or general Markdown. */
export function GuideText({ text }: { text: string }) {
  return guideTextParts(text).map((part, index) =>
    index % 2 ? (
      <strong className="workshop-named-entity" key={index}>
        {part}
      </strong>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    ),
  );
}
