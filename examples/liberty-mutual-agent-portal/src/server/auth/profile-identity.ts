import 'server-only';
import { createHash } from 'node:crypto';

/** Opaque identifier, deliberately separate from Sitecore's generated native profile UUID. */
export function getProfileIdentifier(reviewerPack: string, agentId: string, generation: number): string {
  return createHash('sha256').update(`liberty-mutual-agent:v1:${reviewerPack}:${agentId}:${generation}`).digest('hex').slice(0, 32);
}

/** New restarts use one immutable set ID; host scopes cannot reuse native history. */
export function getFreshProfileIdentifier(identityScope: string, profileSetId: string, reviewerPack: string, agentId: string): string {
  return createHash('sha256').update(JSON.stringify(['liberty-mutual-agent', 2, identityScope, profileSetId, reviewerPack, agentId])).digest('hex').slice(0, 32);
}
