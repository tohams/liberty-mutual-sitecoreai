export const CONSENT_COOKIE = "lm_public_consent_v1";
export const CONSENT_EVENT = "lm-public-consent";
export type ConsentChoice = "all" | "essential";

export function readConsent(): ConsentChoice | null {
  if (typeof document === "undefined") return null;
  const value = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(`${CONSENT_COOKIE}=`))
    ?.split("=")[1];
  return value === "all" || value === "essential" ? value : null;
}

export function trackingAllowed(): boolean {
  if (
    typeof navigator !== "undefined" &&
    (navigator as Navigator & { globalPrivacyControl?: boolean })
      .globalPrivacyControl
  )
    return false;
  return readConsent() === "all";
}

export function saveConsent(choice: ConsentChoice): void {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CONSENT_COOKIE}=${choice}; Path=/; Max-Age=15552000; SameSite=Lax${secure}`;
  window.dispatchEvent(new Event(CONSENT_EVENT));
}
