export class PersonalizationRequestSuperseded extends Error {
  constructor() {
    super("The selected page changed. Preview the current page instead.");
    this.name = "PersonalizationRequestSuperseded";
  }
}

interface RequestState {
  controller: AbortController;
  activeController: () => AbortController | null;
  expectedPageKey: string;
  currentPageKey: () => string;
}

/** JSON parsing may finish after a page switch, even when fetch has been aborted. */
export async function readCurrentPersonalizationResponse(
  response: Pick<Response, "json">,
  request: RequestState,
): Promise<unknown> {
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (
    request.controller.signal.aborted ||
    request.activeController() !== request.controller ||
    request.currentPageKey() !== request.expectedPageKey
  )
    throw new PersonalizationRequestSuperseded();
  return payload;
}
