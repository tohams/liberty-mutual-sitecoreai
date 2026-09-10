import type { PortalBootstrap } from "@/contracts/portal";
import type { PortalContextValue } from "./portal.types";

/** Design Library receives only the server's isolated, identity-free editor snapshot. */
export function createReadonlyEditorContext(
  data: PortalBootstrap,
): PortalContextValue {
  if (
    data.session.runId !== "editor" ||
    data.session.profileId ||
    data.udlIdentity
  ) {
    throw new Error(
      "An isolated editor snapshot is required for Design Library.",
    );
  }
  return {
    data,
    busy: true,
    act: async () => null,
    notify: () => undefined,
  };
}
