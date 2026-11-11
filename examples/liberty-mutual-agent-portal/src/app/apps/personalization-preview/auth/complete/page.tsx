import { requirePersonalizationPreviewSession } from "@/server/marketplace/personalization-preview-auth";
import { PersonalizationPreviewAuthComplete } from "@/features/personalization-preview/PersonalizationPreviewAuthComplete";
import { personalizationPreviewCompletionOutcome } from "@/features/personalization-preview/sso";

export const dynamic = "force-dynamic";

export default async function PersonalizationPreviewSignInComplete({
  searchParams,
}: {
  searchParams: Promise<{ outcome?: string }>;
}) {
  let signedIn = false;
  try {
    await requirePersonalizationPreviewSession();
    signedIn = true;
  } catch {
    // Tokens and authentication error details never enter the rendered document.
  }
  const requested = await searchParams;
  return (
    <PersonalizationPreviewAuthComplete
      outcome={personalizationPreviewCompletionOutcome(
        signedIn,
        requested.outcome,
      )}
    />
  );
}
