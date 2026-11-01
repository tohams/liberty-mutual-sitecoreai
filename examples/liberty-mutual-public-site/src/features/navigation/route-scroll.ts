/** Preserve hash destinations and browser history restoration while starting new pages at the top. */
export function shouldResetRouteScroll(
  previousPath: string,
  nextPath: string,
  hash: string,
  restoredPath: string | null,
): boolean {
  return previousPath !== nextPath && !hash && restoredPath !== nextPath;
}
