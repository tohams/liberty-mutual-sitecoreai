/* eslint-disable @next/next/no-html-link-for-pages -- OAuth sign-in requires full-document navigation to issue transaction cookies. */
import type { Metadata } from "next";
import { requireAudiencePreviewSession } from "@/server/marketplace/audience-preview-auth";
import { resolveAuthorizedPreviewPage } from "@/server/marketplace/audience-preview-pages";
import { AudiencePreviewError } from "@/server/marketplace/audience-preview-config";
import { readAudiencePreviewViewSession } from "@/server/audience-preview/preview-sessions";
import { AudiencePreviewView } from "@/server/audience-preview/view";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata: Metadata = {
  title: "Audience Preview",
  robots: { index: false, follow: false },
};

export default async function AudiencePreviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  try {
    const actor = await requireAudiencePreviewSession();
    const session = await readAudiencePreviewViewSession(
      token,
      actor.user.sub!,
    );
    // A valid opaque token never substitutes for this account's current access.
    const selected = await resolveAuthorizedPreviewPage(
      {
        pageId: session.page.id,
        language: session.page.language,
        version: session.page.version,
      },
      actor.accessToken,
    );
    return await AudiencePreviewView({ session, selected });
  } catch (error) {
    const authenticationRequired =
      error instanceof AudiencePreviewError && error.status === 401;
    const message =
      error instanceof AudiencePreviewError
        ? error.message
        : "The page could not be previewed. Return to Audience Preview in Page Builder and try again.";
    return (
      <main
        style={{
          maxWidth: 560,
          margin: "80px auto",
          padding: 24,
          fontFamily: "Arial, sans-serif",
          color: "#252336",
          lineHeight: 1.6,
        }}
      >
        <h1 style={{ fontSize: 26 }}>
          {authenticationRequired
            ? "Sign in to SitecoreAI"
            : "Preview unavailable"}
        </h1>
        <p>{message}</p>
        {authenticationRequired ? (
          <a href="/apps/audience-preview/auth/login">Sign in</a>
        ) : null}
      </main>
    );
  }
}
