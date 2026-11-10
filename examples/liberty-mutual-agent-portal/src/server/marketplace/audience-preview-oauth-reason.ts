import "server-only";
import type { SessionData } from "@auth0/nextjs-auth0/types";

const contextParameters = [
  ["tenant_id", "missing-tenant-context"],
  ["organization_id", "missing-organization-context"],
  ["product_codes", "missing-product-context"],
] as const;

function reasonCategory(message: string): string {
  for (const [parameter, category] of contextParameters) {
    if (
      new RegExp(
        `\\b${parameter}\\b\\s+(?:(?:parameter|value)\\s+)?(?:(?:is|was)\\s+)?(?:required|missing|not provided|not specified)\\b|\\b(?:Missing|required)\\s+(?:the\\s+)?(?:parameter[ :]+)?${parameter}\\b`,
        "i",
      ).test(message)
    )
      return category;
  }
  if (
    /\brefresh[ _-]token\s+(?:(?:is|was|has been)\s+)?(?:expired|revoked|invalid|reused)\b|\b(?:expired|revoked|invalid|reused)\s+refresh[ _-]token\b/i.test(
      message,
    )
  )
    return "refresh-token-rejected";
  if (/\buser\s+(?:(?:is|was)\s+)?(?:blocked|disabled)\b/i.test(message))
    return "account-disabled";
  return "unclassified";
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Temporary private diagnostic. Call only for an already-allowlisted SDK OAuth cause. */
export function audiencePreviewOAuthReason(
  message: unknown,
  session: SessionData | null | undefined,
): { oauthReasonCategory?: string; oauthReason?: string } {
  if (typeof message !== "string" || !message.trim() || message.length > 4_096)
    return {};
  const category = reasonCategory(message);
  if (category !== "unclassified") return { oauthReasonCategory: category };
  let excerpt = message
    .replace(/\{[\s\S]*\}/g, "[structured data]")
    .replace(/\[[\s\S]*\]/g, "[structured data]");
  const tokens = [
    session?.tokenSet?.accessToken,
    session?.tokenSet?.idToken,
    session?.tokenSet?.refreshToken,
    ...(session?.accessTokens || []).map((token) => token.accessToken),
  ];
  for (const token of tokens)
    if (typeof token === "string" && token)
      excerpt = excerpt.split(token).join("[credential]");
  const user = session?.user;
  const identities = [
    user?.sub,
    user?.name,
    user?.nickname,
    user?.given_name,
    user?.family_name,
    user?.email,
    user?.org_id,
    user?.act?.sub,
    user?.act?.iss,
  ]
    .filter(
      (value): value is string =>
        typeof value === "string" && value.length >= 2,
    )
    .sort((left, right) => right.length - left.length);
  for (const identity of identities) {
    const left = /^[A-Za-z0-9_]/.test(identity) ? "\\b" : "";
    const right = /[A-Za-z0-9_]$/.test(identity) ? "\\b" : "";
    excerpt = excerpt.replace(
      new RegExp(`${left}${escapeRegex(identity)}${right}`, "gi"),
      "[identity]",
    );
  }
  excerpt = excerpt
    .replace(/\b(?:Bearer|Basic)\s+[^\s,;]+/gi, "[credential]")
    .replace(
      /\beyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
      "[credential]",
    )
    .replace(/https?:\/\/[^\s<>"']+/gi, "[URL]")
    .replace(/[^\s<>"'()[\]{},;]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[email]")
    .replace(
      /["']?\b(organization_id|tenant_id|product_codes|client_id|user_id|sub|authorization|access_token|refresh_token|id_token|client_secret|password|secret|token|api_key|api_token|code|email)["']?\s*[:=]\s*(?:"[^"]*"|'[^']*'|[^\s,;&<>]+)/gi,
      "$1=[redacted]",
    )
    .replace(
      /\b[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}\b/gi,
      "[identifier]",
    )
    .replace(/\b[A-Za-z0-9_+/=-]{20,}\b/g, "[identifier]")
    .replace(/\b\d{3,}\b/g, "[number]")
    .replace(/<[^>]*>/g, " ")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);
  return {
    oauthReasonCategory: category,
    ...(excerpt ? { oauthReason: excerpt } : {}),
  };
}
