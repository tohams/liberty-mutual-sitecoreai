import "server-only";
import type { DemoInput, DemoStep } from "./types";

/** Anonymous guides retain the header template; credentials require a verified session. */
export function presenterInputs(
  step: DemoStep,
  { includeDeliveryToken = false }: { includeDeliveryToken?: boolean } = {},
): DemoInput[] {
  const deliveryToken = includeDeliveryToken
    ? process.env.DEMO_GRAPHQL_DELIVERY_API_KEY?.trim()
    : undefined;
  return (step.inputs ?? []).map((input) =>
    step.id === "public-api" && input.label === "HTTP headers" && deliveryToken
      ? {
          ...input,
          value: JSON.stringify({ sc_apikey: deliveryToken }, null, 2),
        }
      : input,
  );
}
