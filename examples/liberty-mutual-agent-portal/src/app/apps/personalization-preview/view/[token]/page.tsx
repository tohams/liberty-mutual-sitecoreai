/* eslint-disable @next/next/no-html-link-for-pages -- OAuth requires full-document navigation to issue transaction cookies. */
import type { Metadata } from "next";
import { requirePersonalizationPreviewSession } from "@/server/marketplace/personalization-preview-auth";
import { resolveAuthorizedPersonalizationPreviewPage } from "@/server/marketplace/personalization-preview-pages";
import { PersonalizationPreviewError } from "@/server/marketplace/personalization-preview-config";
import { readPersonalizationPreviewViewSession } from "@/server/personalization-preview/preview-sessions";
import { PersonalizationPreviewView } from "@/server/personalization-preview/view";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata: Metadata = {
  title: "Personalization Preview",
  robots: { index: false, follow: false },
};

export default async function PersonalizationPreviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  try {
    const actor = await requirePersonalizationPreviewSession();
    const session = await readPersonalizationPreviewViewSession(
      token,
      actor.user.sub!,
    );
    const selected = await resolveAuthorizedPersonalizationPreviewPage(
      {
        pageId: session.page.id,
        language: session.page.language,
        version: session.page.version,
      },
      actor.accessToken,
    );
    return await PersonalizationPreviewView({
      session,
      selected,
      accessToken: actor.accessToken,
    });
  } catch (error) {
    const knownError = error instanceof PersonalizationPreviewError;
    const authenticationRequired = knownError && error.status === 401;
    const message = knownError
      ? error.message
      : "The page could not be previewed. Return to Personalization Preview in Page Builder, and try again.";
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
          <a href="/apps/personalization-preview/auth/login">Sign in</a>
        ) : null}
      </main>
    );
  }
}
