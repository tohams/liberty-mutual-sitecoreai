export interface MarketingEligibilityProfile {
  identifier: string;
  profileId: string;
  displayName: string;
  agencyName: string;
  /** Selected by the native decision response, never by the submitted preference. */
  eligible: boolean;
  nativeResponse: {
    marketingEligible: boolean;
    marketingSuppressed: boolean;
    preferenceKnown: true;
    profileId: string;
  };
}

export interface MarketingEligibilityResult {
  preferenceOperationId: string;
  checkedAt: string;
  nativeFriendlyId: string;
  profiles: MarketingEligibilityProfile[];
}
