import {
  METADATA_FIELDS, METADATA_MODEL, MetadataError, normalizeMetadataId,
  type MetadataContext, type MetadataOption, type MetadataSnapshot, type MetadataValues,
} from './metadata-contract';

export interface MetadataTransport {
  getContext(): Promise<unknown>;
  /** Return GraphQL data only; reject transport errors and GraphQL errors. Never log raw responses. */
  query(document: string, variables: Record<string, unknown>): Promise<unknown>;
}
type ObjectValue = Record<string, unknown>;
type NativeField = { fieldId: string; name: string; value: string };
type ContextState = { context: MetadataContext; blockedReason?: string };
type NativeResource = {
  title: string; revision: string; sharedRevision: string; workflowId: string; workflowStateId: string;
  values: MetadataValues; fields: NativeField[]; blockedReason?: string;
};
type Baseline = { snapshot: MetadataSnapshot; fields: NativeField[]; taxonomyFingerprint: string; consumed: boolean };

const READ_RESOURCE = `query ResourceMetadataItem($where:ItemQueryInput!,$after:String) {
  item(where:$where) {
    itemId path version template { templateId }
    revision:field(name:"__Revision") { value }
    sharedRevision:field(name:"__Shared revision") { value }
    workflow { canEdit canSave workflow { workflowId } workflowState { stateId final } }
    fields(first:100,after:$after,excludeStandardFields:false,ownFields:false,withLanguageFallback:false) {
      nodes { fieldId name value } pageInfo { hasNextPage endCursor }
    }
  }
}`;
const READ_TAXONOMY = `query ResourceMetadataOptions($where:ItemQueryInput!,$fieldId:ID!) {
  fieldDefinition:item(where:{database:"master",itemId:$fieldId,language:"en"}) {
    itemId name path template { templateId } type:field(name:"Type") { value }
    shared:field(name:"Shared") { value } unversioned:field(name:"Unversioned") { value }
  }
  item(where:$where) {
    itemId path parent { itemId } template { templateId }
    revision:field(name:"__Revision") { value }
    children(first:100) {
      nodes {
        itemId name path parent { itemId } template { templateId }
        display:field(name:"__Display name") { fieldId name value }
        description:field(name:"description") { fieldId name value }
        revision:field(name:"__Revision") { value }
      }
      pageInfo { hasNextPage }
    }
  }
}`;
const UPDATE_RESOURCE = `mutation SaveResourceMetadata($input:UpdateItemInput!) {
  updateItem(input:$input) { item { itemId } }
}`;
const UPDATED_FIELDS = new Set(['__Revision', '__Shared revision', '__Updated', '__Updated by']);
const DRAFT_REQUIRED = 'Create a new draft version in Page builder before editing resource metadata.';
const STALE_MESSAGE = 'The page or metadata lists changed. Refresh this panel before saving.';

function object(value: unknown): ObjectValue {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as ObjectValue : {};
}
function text(value: unknown): string { return typeof value === 'string' ? value : ''; }
function equalId(left: unknown, right: unknown): boolean {
  const id = normalizeMetadataId(left);
  return !!id && id === normalizeMetadataId(right);
}
function assert(condition: unknown, code: MetadataError['code'], message: string): asserts condition {
  if (!condition) throw new MetadataError(code, message);
}
function sameContext(left: MetadataContext, right: MetadataContext): boolean {
  return equalId(left.itemId, right.itemId) && left.path === right.path && left.language === right.language && left.version === right.version;
}
function readContext(raw: unknown): ContextState {
  const source = object(raw), site = object(source.siteInfo), page = object(source.pageInfo);
  const path = text(page.path), language = text(page.language), version = page.version;
  assert(site.name === METADATA_MODEL.siteName && path.startsWith(`${METADATA_MODEL.resourceRoot}/`) &&
    !path.includes('/../') && equalId(object(page.template).id, METADATA_MODEL.resourceTemplateId) &&
    normalizeMetadataId(page.id) && /^[a-z]{2}(?:-[a-z0-9]{2,8})*$/i.test(language) &&
    typeof version === 'number' && Number.isInteger(version) && version > 0,
  'CONTEXT', 'Open a Liberty Mutual resource page in Page builder to manage its metadata.');
  const permission = object(page.permissions), locking = object(page.locking);
  const blockedReason = permission.canWrite !== true || permission.canWriteLanguage !== true
    ? 'Your Sitecore account does not have permission to edit this page and language.'
    : locking.isLocked !== false && locking.lockedByCurrentUser !== true
      ? 'The page is locked by another author, or its lock status is unavailable.' : undefined;
  return { context: { itemId: normalizeMetadataId(page.id), path, language, version }, blockedReason };
}
function nativeFields(value: unknown): NativeField[] {
  assert(Array.isArray(value), 'MODEL', 'The resource metadata fields could not be verified.');
  return value.map((entry) => {
    const field = object(entry);
    assert(normalizeMetadataId(field.fieldId) && typeof field.name === 'string' && typeof field.value === 'string',
      'MODEL', 'The resource metadata fields could not be verified.');
    return { fieldId: normalizeMetadataId(field.fieldId), name: field.name, value: field.value };
  });
}
function fieldByName(fields: NativeField[], name: string): string {
  const matches = fields.filter(field => field.name === name);
  assert(matches.length === 1, 'MODEL', 'The resource metadata model has changed. Ask a developer to review it.');
  return matches[0].value;
}
function protectedFields(fields: NativeField[]): string {
  const ids = new Set(METADATA_FIELDS.map(field => normalizeMetadataId(field.fieldId)));
  return JSON.stringify(fields.filter(field => !ids.has(field.fieldId) && !UPDATED_FIELDS.has(field.name))
    .map(field => [field.fieldId, field.name, field.value]).sort((a, b) => a[0].localeCompare(b[0])));
}
function valuesEqual(left: MetadataValues, right: MetadataValues): boolean {
  return METADATA_FIELDS.every(field => left[field.name] === right[field.name]);
}

export function createMetadataService(transport: MetadataTransport) {
  const baselines = new WeakMap<MetadataSnapshot, Baseline>();
  let saving = false;
  async function query(document: string, variables: Record<string, unknown>) {
    try { return object(await transport.query(document, variables)); }
    catch { throw new MetadataError('READ_FAILED', 'Sitecore could not be reached. Refresh the panel and try again.'); }
  }
  async function context() {
    try { return readContext(await transport.getContext()); }
    catch (error) {
      if (error instanceof MetadataError) throw error;
      throw new MetadataError('CONTEXT', 'Page builder context is unavailable. Reopen the Resource metadata app.');
    }
  }
  async function resource(expected: MetadataContext): Promise<NativeResource> {
    const fields: NativeField[] = [];
    let after: string | undefined, revision = '', sharedRevision = '', initial: ObjectValue | undefined;
    for (let page = 0; page < 10; page++) {
      const data = await query(READ_RESOURCE, { where: { database: 'master', itemId: expected.itemId,
        language: expected.language, version: expected.version, existingVersionOnly: true }, after });
      const item = object(data.item);
      assert(equalId(item.itemId, expected.itemId) && item.path === expected.path && item.version === expected.version &&
        equalId(object(item.template).templateId, METADATA_MODEL.resourceTemplateId),
      'MODEL', 'The selected resource version no longer matches this panel. Refresh before editing.');
      const nextRevision = text(object(item.revision).value), nextShared = text(object(item.sharedRevision).value);
      assert(normalizeMetadataId(nextRevision) && normalizeMetadataId(nextShared), 'MODEL', 'The resource revision could not be verified.');
      if (!initial) { initial = item; revision = nextRevision; sharedRevision = nextShared; }
      assert(revision === nextRevision && sharedRevision === nextShared, 'STALE', STALE_MESSAGE);
      const connection = object(item.fields), pageInfo = object(connection.pageInfo);
      fields.push(...nativeFields(connection.nodes));
      assert(typeof pageInfo.hasNextPage === 'boolean', 'MODEL', 'The complete resource fields could not be read.');
      if (!pageInfo.hasNextPage) break;
      const cursor = text(pageInfo.endCursor);
      assert(cursor && cursor !== after && page < 9, 'MODEL', 'The complete resource fields could not be read.');
      after = cursor;
    }
    assert(new Set(fields.map(field => field.fieldId)).size === fields.length, 'MODEL', 'The resource returned duplicate fields.');
    assert(fieldByName(fields, '__Revision') === revision && fieldByName(fields, '__Shared revision') === sharedRevision,
      'STALE', STALE_MESSAGE);
    const values = {} as MetadataValues;
    for (const definition of METADATA_FIELDS) {
      const field = fields.find(candidate => equalId(candidate.fieldId, definition.fieldId));
      assert(field && field.name === definition.name, 'MODEL', 'The resource metadata field definitions have changed.');
      values[definition.name] = field.value;
    }
    const workflow = object(initial?.workflow), workflowId = fieldByName(fields, '__Workflow'), workflowStateId = fieldByName(fields, '__Workflow state');
    assert(equalId(workflowId, METADATA_MODEL.workflowId) && equalId(object(workflow.workflow).workflowId, workflowId) &&
      equalId(object(workflow.workflowState).stateId, workflowStateId), 'MODEL', 'The resource workflow could not be verified.');
    const blockedReason = !equalId(workflowStateId, METADATA_MODEL.draftStateId) || object(workflow.workflowState).final !== false
      ? DRAFT_REQUIRED : workflow.canEdit !== true || workflow.canSave !== true
        ? 'The current workflow does not allow this resource to be edited.' : undefined;
    return { title: fieldByName(fields, 'Title'), revision, sharedRevision, workflowId, workflowStateId, values, fields, blockedReason };
  }
  async function taxonomy(language: string) {
    const options = {} as MetadataSnapshot['options'];
    const fingerprint: unknown[] = [];
    await Promise.all(METADATA_FIELDS.map(async (definition) => {
      const data = await query(READ_TAXONOMY, { where: { database: 'master', itemId: definition.sourceId, language, existingVersionOnly: true }, fieldId: definition.fieldId });
      const fieldDefinition = object(data.fieldDefinition);
      assert(equalId(fieldDefinition.itemId, definition.fieldId) && fieldDefinition.name === definition.name &&
        fieldDefinition.path === `/sitecore/templates/Project/LibertyMutual/ResourcePage/Content/${definition.name}` &&
        equalId(object(fieldDefinition.template).templateId, '455a3e98-a627-4b40-8035-e683a0331ac7') &&
        object(fieldDefinition.type).value === 'Single-Line Text',
      'MODEL', 'The metadata fields must retain their supported Single-Line Text type. Ask a developer to review the content model.');
      assert([fieldDefinition.shared, fieldDefinition.unversioned].every(field => {
        const value = object(field).value;
        return value === '' || value === '0';
      }), 'MODEL', 'Resource metadata fields must remain specific to each language and version. Ask a developer to review the content model.');
      const folder = object(data.item), children = object(folder.children), pageInfo = object(children.pageInfo);
      assert(equalId(folder.itemId, definition.sourceId) && folder.path === definition.sourcePath &&
        equalId(object(folder.parent).itemId, METADATA_MODEL.taxonomyRootId) &&
        equalId(object(folder.template).templateId, METADATA_MODEL.folderTemplateId) &&
        Array.isArray(children.nodes) && children.nodes.length > 0 && pageInfo.hasNextPage === false,
      'TAXONOMY', 'A managed metadata list is missing, empty, or too large. Ask a content administrator to review Data/Taxonomy.');
      const entries = (children.nodes as unknown[]).map((raw): MetadataOption & { revision: string } => {
        const item = object(raw), display = object(item.display), description = object(item.description);
        const name = text(item.name);
        assert(normalizeMetadataId(item.itemId) && name.trim() === name && name.length > 0 && !/[\/\\<>|{}]/.test(name) &&
          item.path === `${definition.sourcePath}/${name}` && equalId(object(item.parent).itemId, definition.sourceId) &&
          equalId(object(item.template).templateId, METADATA_MODEL.optionTemplateId) &&
          equalId(description.fieldId, METADATA_MODEL.descriptionFieldId) && description.name === 'description' &&
          typeof description.value === 'string' && typeof display.value === 'string' &&
          normalizeMetadataId(object(item.revision).value),
        'TAXONOMY', 'A metadata option has an unexpected template or location. Ask a content administrator to review Data/Taxonomy.');
        return { id: normalizeMetadataId(item.itemId), value: name, label: display.value || name,
          description: description.value, revision: text(object(item.revision).value) };
      });
      assert(new Set(entries.map(entry => entry.value)).size === entries.length && new Set(entries.map(entry => entry.id)).size === entries.length,
        'TAXONOMY', 'The metadata list contains duplicate options. Ask a content administrator to review it.');
      options[definition.name] = entries.map(({ id, value, label, description }) => ({ id, value, label, description }));
      fingerprint.push([definition.name, folder.path, text(object(folder.revision).value), [...entries].sort((a, b) => a.id.localeCompare(b.id))]);
    }));
    return { options, fingerprint: JSON.stringify(fingerprint.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))) };
  }
  function remember(state: ContextState, native: NativeResource, lists: Awaited<ReturnType<typeof taxonomy>>) {
    const blockedReason = state.blockedReason || native.blockedReason;
    const snapshot: MetadataSnapshot = { context: state.context, title: native.title, revision: native.revision,
      sharedRevision: native.sharedRevision, workflowId: native.workflowId, workflowStateId: native.workflowStateId,
      values: native.values, options: lists.options, editable: !blockedReason, ...(blockedReason ? { blockedReason } : {}) };
    baselines.set(snapshot, { snapshot: structuredClone(snapshot), fields: structuredClone(native.fields), taxonomyFingerprint: lists.fingerprint, consumed: false });
    return snapshot;
  }
  async function load(): Promise<MetadataSnapshot> {
    const state = await context();
    const [native, lists] = await Promise.all([resource(state.context), taxonomy(state.context.language)]);
    const fresh = await context();
    assert(sameContext(state.context, fresh.context), 'STALE', STALE_MESSAGE);
    return remember(fresh, native, lists);
  }
  async function save(snapshot: MetadataSnapshot, values: MetadataValues, options?: { isCurrent?: () => boolean }) {
    const baseline = baselines.get(snapshot);
    assert(baseline && !baseline.consumed && !saving, 'STALE', 'Refresh this panel before attempting another save.');
    assert(baseline.snapshot.editable, 'READ_ONLY', baseline.snapshot.blockedReason || DRAFT_REQUIRED);
    assert(Object.keys(values).length === METADATA_FIELDS.length && METADATA_FIELDS.every(field => typeof values[field.name] === 'string'),
      'SELECTION', 'Select one managed option for every metadata field.');
    const requested = structuredClone(values);
    saving = true;
    try {
      const state = await context();
      assert(sameContext(state.context, baseline.snapshot.context), 'STALE', STALE_MESSAGE);
      assert(!state.blockedReason, 'READ_ONLY', state.blockedReason || 'The page cannot be edited.');
      const [native, lists] = await Promise.all([resource(state.context), taxonomy(state.context.language)]);
      assert(!native.blockedReason, 'READ_ONLY', native.blockedReason || DRAFT_REQUIRED);
      assert(native.revision === baseline.snapshot.revision && native.sharedRevision === baseline.snapshot.sharedRevision &&
        valuesEqual(native.values, baseline.snapshot.values) && protectedFields(native.fields) === protectedFields(baseline.fields) &&
        lists.fingerprint === baseline.taxonomyFingerprint, 'STALE', STALE_MESSAGE);
      assert(METADATA_FIELDS.every(field => lists.options[field.name].some(option => option.value === requested[field.name])),
        'SELECTION', 'Select a current managed option for every metadata field.');
      const changedFields = METADATA_FIELDS.filter(field => requested[field.name] !== native.values[field.name]).map(field => field.name);
      const fresh = await context();
      assert(sameContext(fresh.context, state.context) && (!options?.isCurrent || options.isCurrent()), 'STALE', STALE_MESSAGE);
      assert(!fresh.blockedReason, 'READ_ONLY', fresh.blockedReason || 'The page cannot be edited.');
      if (!changedFields.length) return { snapshot: remember(fresh, native, lists), changedFields };
      // Authoring GraphQL has no atomic revision precondition. Never retry or roll back an uncertain write.
      baseline.consumed = true;
      try {
        const result = await transport.query(UPDATE_RESOURCE, { input: { database: 'master', itemId: state.context.itemId,
          language: state.context.language, version: state.context.version,
          fields: METADATA_FIELDS.filter(field => changedFields.includes(field.name)).map(field => ({ name: field.fieldId, value: requested[field.name] })) } });
        assert(equalId(object(object(object(result).updateItem).item).itemId, state.context.itemId), 'SAVE_UNCERTAIN', 'Save confirmation was incomplete.');
        const verified = await resource(state.context);
        assert(valuesEqual(verified.values, requested) && protectedFields(verified.fields) === protectedFields(native.fields) && !verified.blockedReason,
          'SAVE_UNCERTAIN', 'The saved fields could not be verified.');
        return { snapshot: remember(fresh, verified, lists), changedFields };
      } catch {
        throw new MetadataError('SAVE_UNCERTAIN', 'The save result could not be confirmed. Refresh the panel and inspect the current values before making another change.');
      }
    } finally { saving = false; }
  }
  return { load, save };
}
