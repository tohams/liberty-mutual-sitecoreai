import { requireAudiencePreviewSession } from "@/server/marketplace/audience-preview-auth";
import { AudiencePreviewAuthComplete } from "@/features/audience-preview/AudiencePreviewAuthComplete";
import { audiencePreviewCompletionOutcome } from "@/features/audience-preview/sso";

export const dynamic = "force-dynamic";

export default async function AudiencePreviewSignInComplete({
  searchParams,
}: {
  searchParams: Promise<{ outcome?: string }>;
}) {
  let signedIn = false;
  try {
    await requireAudiencePreviewSession();
    signedIn = true;
  } catch {
    // Tokens and authentication error details never enter the rendered document.
  }
  const requested = await searchParams;
  return (
    <AudiencePreviewAuthComplete
      outcome={audiencePreviewCompletionOutcome(signedIn, requested.outcome)}
    />
  );
}
