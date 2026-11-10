import type { AgentRole, StateCode } from "@/contracts/portal";

export interface AudiencePreviewInput {
  role: AgentRole;
  licensedStates: StateCode[];
  specializesInSmallCommercial: boolean;
  agencySmallCommercialSharePercent: number;
  agencyTotalWrittenPremiumUsd: number;
  agentSmallCommercialWrittenPremiumUsd: number;
}

export interface AudiencePreviewPage {
  id: string;
  name: string;
  siteName: string;
  language: string;
  version?: number;
  path?: string;
}

export interface AudiencePreviewMatch {
  componentName: string;
  experienceName: string;
}

/** Populated by the preview service after native personalization is evaluated. */
export interface AudiencePreviewResult {
  previewUrl: string;
  title: string;
  matchedRules: AudiencePreviewMatch[];
  description?: string;
}

export interface AudiencePreviewPanelProps {
  page: AudiencePreviewPage | null;
  onPreview: (
    audience: AudiencePreviewInput,
    page: AudiencePreviewPage,
  ) => Promise<AudiencePreviewResult>;
  initialAudience?: AudiencePreviewInput;
  disabled?: boolean;
}
