"use client";
import { DateField, type Field } from "@sitecore-content-sdk/nextjs";

export default function PublicationDate({
  field,
  label,
}: {
  field?: Field<string>;
  label: string;
}) {
  if (!field?.value) return null;
  return (
    <p>
      {label}{" "}
      <DateField
        field={field}
        render={(date) =>
          date?.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
            timeZone: "UTC",
          })
        }
      />
    </p>
  );
}
