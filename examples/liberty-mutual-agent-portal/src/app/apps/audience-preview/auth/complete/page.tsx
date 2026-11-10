import { requireAudiencePreviewSession } from "@/server/marketplace/audience-preview-auth";

export const dynamic = "force-dynamic";

export default async function AudiencePreviewSignInComplete() {
  let signedIn = false;
  try {
    await requireAudiencePreviewSession();
    signedIn = true;
  } catch {
    // Tokens and authentication error details never enter the rendered document.
  }
  return (
    <main
      style={{
        maxWidth: 480,
        margin: "80px auto",
        padding: 24,
        fontFamily: "Arial, sans-serif",
        color: "#252336",
        lineHeight: 1.6,
      }}
    >
      <h1 style={{ fontSize: 26 }}>
        {signedIn ? "You’re signed in" : "Sign-in could not be completed"}
      </h1>
      <p>
        {signedIn
          ? "Return to Audience Preview in Page Builder and select Continue. You can close this window."
          : "Return to Audience Preview in Page Builder and select Sign in to try again."}
      </p>
    </main>
  );
}
