import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import manifest from "../../../fixtures/manifest.json";
import { PortalError } from "../errors";

export const WORKSHOP_SESSION_COOKIE = "lm_workshop_session";
export const WORKSHOP_SESSION_DURATION_SECONDS = 8 * 60 * 60;
const WORKSHOP_SESSION_PURPOSE = "liberty-mutual-workshops";

export interface WorkshopSession {
  username: string;
  reviewerPack: string;
  sessionId: string;
  issuedAt: string;
  expiresAt: string;
}

function signingKey(): Uint8Array {
  const secret = process.env.PORTAL_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new PortalError(
      "CONFIGURATION_REQUIRED",
      "The workshop sign-in service is not configured.",
      503,
    );
  }
  return new TextEncoder().encode(secret);
}

/** Workshop access never establishes an agent identity or changes CDP browsing behavior. */
export async function createWorkshopSession(
  identity: Pick<WorkshopSession, "username" | "reviewerPack">,
  now = new Date(),
): Promise<{ token: string; session: WorkshopSession }> {
  const issuedAt = Math.floor(now.getTime() / 1000);
  const session: WorkshopSession = {
    username: identity.username,
    reviewerPack: identity.reviewerPack,
    sessionId: randomUUID(),
    issuedAt: now.toISOString(),
    expiresAt: new Date(
      (issuedAt + WORKSHOP_SESSION_DURATION_SECONDS) * 1000,
    ).toISOString(),
  };
  const token = await new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(WORKSHOP_SESSION_PURPOSE)
    .setAudience(WORKSHOP_SESSION_PURPOSE)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + WORKSHOP_SESSION_DURATION_SECONDS)
    .sign(signingKey());
  return { token, session };
}

export async function verifyWorkshopSession(
  token?: string,
  now = new Date(),
): Promise<WorkshopSession | null> {
  if (!token) return null;
  const key = signingKey();
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
      issuer: WORKSHOP_SESSION_PURPOSE,
      audience: WORKSHOP_SESSION_PURPOSE,
      currentDate: now,
    });
    const fields = [
      "username",
      "reviewerPack",
      "sessionId",
      "issuedAt",
      "expiresAt",
    ] as const;
    if (
      fields.some(
        (field) => typeof payload[field] !== "string" || !payload[field],
      )
    )
      return null;
    if (!manifest.reviewerPacks.includes(String(payload.reviewerPack)))
      return null;
    return Object.fromEntries(
      fields.map((field) => [field, payload[field]]),
    ) as unknown as WorkshopSession;
  } catch {
    return null;
  }
}

export async function getWorkshopSession(): Promise<WorkshopSession | null> {
  return verifyWorkshopSession(
    (await cookies()).get(WORKSHOP_SESSION_COOKIE)?.value,
  );
}

/** Allow only canonical workshop paths, never external, encoded, or portal destinations. */
export function workshopReturnTo(value: unknown): string {
  if (typeof value !== "string" || value.length > 240) return "/workshops";
  if (!/^\/workshops(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*\/?$/.test(value))
    return "/workshops";
  const normalized = value.replace(/\/$/, "");
  return normalized === "/workshops/login" ? "/workshops" : normalized;
}

export async function requireWorkshopSession(
  returnTo = "/workshops",
): Promise<WorkshopSession> {
  const session = await getWorkshopSession();
  if (!session) {
    const { redirect } = await import("next/navigation");
    return redirect(
      `/workshops/login?returnTo=${encodeURIComponent(workshopReturnTo(returnTo))}`,
    );
  }
  return session;
}

export const workshopSessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: WORKSHOP_SESSION_DURATION_SECONDS,
};
