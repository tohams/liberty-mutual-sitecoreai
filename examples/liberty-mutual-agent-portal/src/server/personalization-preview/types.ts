/** Serializable contracts shared by the Marketplace panel and preview service. */
export interface PersonalizationPreviewPageRequest {
  pageId: string;
  language: string;
  version?: number;
  siteName?: string;
}

export interface PersonalizationPreviewOption {
  id: string;
  label: string;
  control: boolean;
}

export interface PersonalizationPreviewFlow {
  id: string;
  name: string;
  componentName?: string;
  options: PersonalizationPreviewOption[];
  defaultOptionId: string;
}

export interface PersonalizationPreviewPage {
  id: string;
  name: string;
  path: string;
  contentPath: string;
  siteName: string;
  language: string;
  version: number;
}

export interface PersonalizationPreviewContext {
  page: PersonalizationPreviewPage;
  revision: string;
  flows: PersonalizationPreviewFlow[];
  warnings?: string[];
}

export interface PersonalizationPreviewSelection {
  flowId: string;
  optionId: string;
}

export interface PersonalizationPreviewRequest extends PersonalizationPreviewPageRequest {
  revision: string;
  selections: PersonalizationPreviewSelection[];
}

export interface SelectedPersonalizationExperience {
  flowId: string;
  flowName: string;
  optionLabel: string;
  componentName?: string;
}

export interface PersonalizationPreviewResult {
  status: "ready";
  previewUrl: string;
  title: string;
  description: string;
  selectedExperiences: SelectedPersonalizationExperience[];
}
