/** Only the two unlinked, read-only presenter guides bypass workshop sign-in. */
export function isDemoGuidePath(path: string): boolean {
  return /^\/demo(?:\/public)?\/?$/.test(path);
}
