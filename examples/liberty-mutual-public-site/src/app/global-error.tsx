"use client";

import Link from "next/link";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "Arial, sans-serif",
          padding: "48px",
          color: "#343741",
        }}
      >
        <h1>Something went wrong</h1>
        <p>Please try again, or return to the home page.</p>
        <button type="button" onClick={reset}>
          Try again
        </button>{" "}
        <Link href="/">Home</Link>
      </body>
    </html>
  );
}
