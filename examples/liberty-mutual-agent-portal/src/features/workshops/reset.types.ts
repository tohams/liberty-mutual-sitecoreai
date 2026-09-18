/** Safe browser-facing contract. Native import payloads and credentials stay server-side. */
export type WorkshopResetMode = "restart";

export interface WorkshopResetProfile {
  username: string;
  name: string;
  identifier: string;
  profileId?: string;
}

export interface WorkshopResetOperation {
  reviewerPack: string;
  mode: WorkshopResetMode;
  requestId: string;
  expectedRunId: string;
  status: "pending" | "completed" | "failed";
  phase: "preparing" | "uploading" | "verifying" | "completed" | "failed";
  runId: string;
  profileGeneration: number;
  targetGeneration?: number;
  retryAfterSeconds?: number;
  code?: string;
  message?: string;
  canResumeVerification: boolean;
  requiresPortalSignIn: boolean;
}

export interface WorkshopResetStatus {
  reviewerPack: string;
  restartAvailable: boolean;
  runId: string;
  profileGeneration: number;
  profiles: WorkshopResetProfile[];
  pendingOperation: WorkshopResetOperation | null;
  operation: WorkshopResetOperation | null;
}

export interface WorkshopResetRequest {
  reviewerPack: string;
  mode: WorkshopResetMode;
  requestId: string;
  expectedRunId: string;
  resumeVerification?: boolean;
}

export interface WorkshopResetResult extends WorkshopResetStatus {
  operation: WorkshopResetOperation;
}
