import metadataModel from '../../data/resource-metadata-model.json';

export type MetadataField = 'state' | 'businessFamily' | 'product' | 'channel' | 'resourceType';
export type MetadataValues = Record<MetadataField, string>;
export interface MetadataOption { id: string; value: string; label: string; description: string }
export interface MetadataContext { itemId: string; path: string; language: string; version: number }
export interface MetadataSnapshot {
  context: MetadataContext;
  title: string;
  revision: string;
  sharedRevision: string;
  workflowId: string;
  workflowStateId: string;
  values: MetadataValues;
  options: Record<MetadataField, MetadataOption[]>;
  editable: boolean;
  blockedReason?: string;
}

const labels: Record<MetadataField, string> = {
  state: 'Risk state', businessFamily: 'Business family', product: 'Product',
  channel: 'Distribution channel', resourceType: 'Resource type',
};
export const METADATA_FIELDS = metadataModel.fields.map((field) => ({
  ...field,
  name: field.name as MetadataField,
  label: labels[field.name as MetadataField],
}));

export const METADATA_MODEL = {
  ...metadataModel.model,
  workflowId: 'b4f49b23-4bba-4c79-ba22-f89f5f0d4e4f',
  draftStateId: '57cc7dce-e6b1-4564-9581-0e5850b8bdf2',
} as const;

export class MetadataError extends Error {
  constructor(public readonly code: 'CONTEXT' | 'READ_FAILED' | 'MODEL' | 'TAXONOMY' | 'READ_ONLY' | 'STALE' | 'SELECTION' | 'SAVE_UNCERTAIN', message: string) {
    super(message);
    this.name = 'MetadataError';
  }
}

export function normalizeMetadataId(value: unknown): string {
  if (typeof value !== 'string' || !/^(?:[a-f\d]{32}|\{?[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}\}?)$/i.test(value)) return '';
  return value.replace(/[{}-]/g, '').toLowerCase();
}
