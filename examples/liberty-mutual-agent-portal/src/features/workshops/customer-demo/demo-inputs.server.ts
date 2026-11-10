import "server-only";
import type { DemoInput, DemoStep } from "./types";

/** Called only after the presenter guide's workshop session has been verified. */
export function presenterInputs(step: DemoStep): DemoInput[] {
  const deliveryToken = process.env.DEMO_GRAPHQL_DELIVERY_API_KEY?.trim();
  return (step.inputs ?? []).map((input) =>
    step.id === "public-api" && input.label === "HTTP headers" && deliveryToken
      ? {
          ...input,
          value: JSON.stringify({ sc_apikey: deliveryToken }, null, 2),
        }
      : input,
  );
}
