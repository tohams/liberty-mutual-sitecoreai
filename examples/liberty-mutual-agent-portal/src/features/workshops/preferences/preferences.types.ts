export type MarketingPreferenceAction = "baseline" | "optout";
export type MarketingPreferencePhase =
  | "idle"
  | "uploading"
  | "queued"
  | "pending"
  | "verified"
  | "rejected"
  | "upload-uncertain"
  | "failed";

export interface MarketingPreferenceProfile {
  identifier: string;
  displayName: string;
  agencyName: string;
  state: "TX";
  role: "producer";
  marketingSuppressed: boolean;
  profileId?: string;
  /** Completion of the native import, rather than an independent profile GET. */
  verifiedAt?: string;
}

export interface MarketingPreferenceStatus {
  status: MarketingPreferencePhase;
  operationId?: string;
  action?: MarketingPreferenceAction;
  batchId?: string;
  profiles: MarketingPreferenceProfile[];
  counts?: { CREATED: number; UPDATED: number; FAILED: number };
  message: string;
  canSubmit: boolean;
  canInspect: boolean;
  retryAfterSeconds?: number;
}
