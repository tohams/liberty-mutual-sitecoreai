import test from 'node:test';
import assert from 'node:assert/strict';
import taxonomyManifest from '../../../../../authoring/items/liberty-mutual/resource-taxonomy-manifest.json';
import contentManifest from '../../../../../authoring/items/liberty-mutual/content-manifest.json';
import metadataModel from '../../data/resource-metadata-model.json';
import { METADATA_FIELDS, METADATA_MODEL, MetadataError, normalizeMetadataId, type MetadataValues } from './metadata-contract';
import { createMetadataService } from './metadata-service';

const guid = (value: number) => `00000000-0000-4000-8000-${String(value).padStart(12, '0')}`;
const pageId = guid(1), revision = guid(2), sharedRevision = guid(3);
const extraFields = [
  { fieldId: guid(101), name: 'Title', value: 'Prepare a businessowners policy submission' },
  { fieldId: guid(102), name: '__Revision', value: revision },
  { fieldId: guid(103), name: '__Shared revision', value: sharedRevision },
  { fieldId: guid(104), name: '__Workflow', value: METADATA_MODEL.workflowId },
  { fieldId: guid(105), name: '__Workflow state', value: METADATA_MODEL.draftStateId },
  { fieldId: guid(106), name: '__Created', value: '20260914T000000Z' },
  { fieldId: guid(107), name: '__Final Renderings', value: '<r>preserved experiment</r>' },
];
function fixture() {
  const state = {
    context: { siteInfo: { name: METADATA_MODEL.siteName as string }, pageInfo: {
      id: pageId, path: `${METADATA_MODEL.resourceRoot}/build-a-bop-submission`, language: 'en', version: 2,
      template: { id: METADATA_MODEL.resourceTemplateId }, permissions: { canWrite: true, canWriteLanguage: true },
      locking: { isLocked: false, lockedByCurrentUser: false },
    } },
    fields: [...METADATA_FIELDS.map(definition => ({ fieldId: definition.fieldId, name: definition.name,
      value: taxonomyManifest.taxonomies.find(taxonomy => taxonomy.field === definition.name)!.options[0].name })), ...structuredClone(extraFields)],
    folders: taxonomyManifest.taxonomies.map(taxonomy => ({
      itemId: taxonomy.sourceId, path: taxonomy.source, parent: { itemId: METADATA_MODEL.taxonomyRootId },
      template: { templateId: METADATA_MODEL.folderTemplateId }, revision: { value: guid(20) },
      children: { pageInfo: { hasNextPage: false }, nodes: taxonomy.options.map(option => ({
        itemId: option.id, name: option.name, path: `${taxonomy.source}/${option.name}`,
        parent: { itemId: taxonomy.sourceId }, template: { templateId: METADATA_MODEL.optionTemplateId },
        display: { fieldId: guid(21), name: '__Display name', value: option.displayName },
        description: { fieldId: METADATA_MODEL.descriptionFieldId, name: 'description', value: option.description },
        revision: { value: guid(22) },
      })) },
    })),
    resourceVersion: 2,
    resourceTemplateId: METADATA_MODEL.resourceTemplateId as string,
    workflowCanSave: true,
    contextReads: 0,
    updates: [] as Array<Record<string, unknown>>,
    throwAfterWrite: false,
    corruptAfterWrite: false,
    beforeContext: undefined as (() => void) | undefined,
    paginate: false,
    fieldType: 'Single-Line Text',
    fieldShared: '' as unknown,
    fieldUnversioned: '' as unknown,
  };
  function value(name: string) { return state.fields.find(field => field.name === name)!.value; }
  const service = createMetadataService({
    getContext: async () => { state.contextReads++; state.beforeContext?.(); return structuredClone(state.context); },
    query: async (document, variables) => {
      if (document.startsWith('query ResourceMetadataOptions')) {
        const where = variables.where as { itemId: string };
        const definition = METADATA_FIELDS.find(field => field.fieldId === variables.fieldId)!;
        return { item: structuredClone(state.folders.find(folder => folder.itemId === where.itemId) ?? null),
          fieldDefinition: { itemId: definition.fieldId, name: definition.name,
            path: `/sitecore/templates/Project/LibertyMutual/ResourcePage/Content/${definition.name}`,
            template: { templateId: '455a3e98-a627-4b40-8035-e683a0331ac7' }, type: { value: state.fieldType },
            shared: { value: state.fieldShared }, unversioned: { value: state.fieldUnversioned } } };
      }
      if (document.startsWith('query ResourceMetadataItem')) {
        const where = variables.where as { language: string; version: number; existingVersionOnly: boolean };
        assert.equal(where.language, 'en'); assert.equal(where.version, 2); assert.equal(where.existingVersionOnly, true);
        return { item: {
          itemId: pageId, path: `${METADATA_MODEL.resourceRoot}/build-a-bop-submission`, version: state.resourceVersion,
          template: { templateId: state.resourceTemplateId }, revision: { value: value('__Revision') }, sharedRevision: { value: value('__Shared revision') },
          workflow: { canEdit: true, canSave: state.workflowCanSave, workflow: { workflowId: METADATA_MODEL.workflowId },
            workflowState: { stateId: value('__Workflow state'), final: value('__Workflow state') !== METADATA_MODEL.draftStateId } },
          fields: { nodes: structuredClone(state.paginate ? variables.after ? state.fields.slice(7) : state.fields.slice(0, 7) : state.fields),
            pageInfo: { hasNextPage: state.paginate && !variables.after, endCursor: 'page-two' } },
        } };
      }
      assert.ok(document.startsWith('mutation SaveResourceMetadata'));
      const input = variables.input as { fields: Array<{ name: string; value: string }> };
      state.updates.push(structuredClone(input));
      for (const update of input.fields) state.fields.find(field => normalizeMetadataId(field.fieldId) === normalizeMetadataId(update.name))!.value = update.value;
      state.fields.find(field => field.name === '__Revision')!.value = guid(30 + state.updates.length);
      if (state.corruptAfterWrite) state.fields.find(field => field.name === 'Title')!.value = 'Unexpected unrelated edit';
      if (state.throwAfterWrite) throw new Error('private transport details must not escape');
      return { updateItem: { item: { itemId: pageId } } };
    },
  });
  return { state, service, setField: (name: string, updated: string) => { state.fields.find(field => field.name === name)!.value = updated; } };
}
const failsWith = (code: MetadataError['code']) => (error: unknown) => error instanceof MetadataError && error.code === code;

test('the app-local metadata contract matches the authoritative CMS manifests', () => {
  assert.deepEqual(metadataModel, {
    model: {
      siteName: 'liberty-mutual-agent-portal',
      resourceRoot: `${taxonomyManifest.site}/Home/resources`,
      resourceTemplateId: contentManifest.templateIds.ResourcePage,
      taxonomyRoot: taxonomyManifest.root,
      taxonomyRootId: taxonomyManifest.rootId,
      optionTemplateId: taxonomyManifest.templateIds.ResourceMetadataOption,
      folderTemplateId: taxonomyManifest.templateIds.ResourceMetadataFolder,
      descriptionFieldId: taxonomyManifest.descriptionFieldId,
    },
    fields: taxonomyManifest.taxonomies.map(taxonomy => ({
      name: taxonomy.field,
      fieldId: contentManifest.fieldIds[`ResourcePage.${taxonomy.field}` as keyof typeof contentManifest.fieldIds],
      sourceId: taxonomy.sourceId,
      sourcePath: taxonomy.source,
    })),
  });
});

test('managed choices and metadata come from the native transport; save changes only a selected field on the exact draft', async () => {
  const { state, service } = fixture(); state.paginate = true;
  state.folders[0].children.nodes[0].display.value = 'A marketer-maintained label';
  const snapshot = await service.load();
  assert.equal(snapshot.options.state[0].label, 'A marketer-maintained label');
  assert.equal(snapshot.editable, true);
  const saved = await service.save(snapshot, { ...snapshot.values, state: 'TX' });
  assert.deepEqual(saved.changedFields, ['state']);
  assert.equal(saved.snapshot.values.state, 'TX');
  assert.notEqual(saved.snapshot.revision, snapshot.revision);
  assert.deepEqual(state.updates, [{ database: 'master', itemId: normalizeMetadataId(pageId), language: 'en', version: 2,
    fields: [{ name: METADATA_FIELDS.find(field => field.name === 'state')!.fieldId, value: 'TX' }] }]);
  assert.equal(state.fields.find(field => field.name === '__Final Renderings')!.value, '<r>preserved experiment</r>');
  assert.equal((await service.save(saved.snapshot, saved.snapshot.values)).changedFields.length, 0);
  assert.equal(state.updates.length, 1);
});

test('wrong site, path, template and unavailable page context never read writable metadata', async () => {
  for (const mutate of [
    (f: ReturnType<typeof fixture>) => { f.state.context.siteInfo.name = 'other-site'; },
    (f: ReturnType<typeof fixture>) => { f.state.context.pageInfo.path = `${METADATA_MODEL.resourceRoot}-other/page`; },
    (f: ReturnType<typeof fixture>) => { f.state.context.pageInfo.template.id = guid(44); },
    (f: ReturnType<typeof fixture>) => { f.state.context.pageInfo.version = 0; },
  ]) { const f = fixture(); mutate(f); await assert.rejects(f.service.load(), failsWith('CONTEXT')); assert.equal(f.state.updates.length, 0); }
});

test('page and language permissions, locks, and native workflow all make the form read only', async () => {
  for (const mutate of [
    (f: ReturnType<typeof fixture>) => { f.state.context.pageInfo.permissions.canWrite = false; },
    (f: ReturnType<typeof fixture>) => { f.state.context.pageInfo.permissions.canWriteLanguage = false; },
    (f: ReturnType<typeof fixture>) => { f.state.context.pageInfo.locking.isLocked = true; },
    (f: ReturnType<typeof fixture>) => { f.setField('__Workflow state', 'f7fe5bdd-a991-4a58-9735-cd08f9b097ab'); },
    (f: ReturnType<typeof fixture>) => { f.state.workflowCanSave = false; },
  ]) {
    const f = fixture(); mutate(f); const snapshot = await f.service.load();
    assert.equal(snapshot.editable, false); assert.ok(snapshot.blockedReason);
    await assert.rejects(f.service.save(snapshot, { ...snapshot.values, state: 'TX' }), failsWith('READ_ONLY'));
    assert.equal(f.state.updates.length, 0);
  }
});

test('fresh context permission and page checks run again at save time', async () => {
  const f = fixture(), snapshot = await f.service.load();
  f.state.context.pageInfo.permissions.canWrite = false;
  await assert.rejects(f.service.save(snapshot, { ...snapshot.values, state: 'TX' }), failsWith('READ_ONLY'));
  f.state.context.pageInfo.permissions.canWrite = true;
  f.state.beforeContext = () => { if (f.state.contextReads >= 5) f.state.context.pageInfo.id = guid(77); };
  await assert.rejects(f.service.save(snapshot, { ...snapshot.values, state: 'TX' }), failsWith('STALE'));
  assert.equal(f.state.updates.length, 0);
});

test('revision, shared revision, hidden field and taxonomy drift block stale saves', async () => {
  for (const mutate of [
    (f: ReturnType<typeof fixture>) => f.setField('__Revision', guid(80)),
    (f: ReturnType<typeof fixture>) => f.setField('__Shared revision', guid(81)),
    (f: ReturnType<typeof fixture>) => f.setField('Title', 'Another author changed this'),
    (f: ReturnType<typeof fixture>) => { f.state.folders[0].children.nodes[0].display.value = 'Changed after form load'; },
  ]) {
    const f = fixture(), snapshot = await f.service.load(); mutate(f);
    await assert.rejects(f.service.save(snapshot, { ...snapshot.values, state: 'TX' }), failsWith('STALE'));
    assert.equal(f.state.updates.length, 0);
  }
});

test('the service requires every list, direct-child options and the expected option and resource field templates', async () => {
  for (const mutate of [
    (f: ReturnType<typeof fixture>) => { f.state.folders.pop(); },
    (f: ReturnType<typeof fixture>) => { f.state.folders[0].children.nodes = []; },
    (f: ReturnType<typeof fixture>) => { f.state.folders[0].children.nodes[0].template.templateId = guid(45); },
    (f: ReturnType<typeof fixture>) => { f.state.folders[0].children.nodes[0].parent.itemId = guid(46); },
    (f: ReturnType<typeof fixture>) => { f.state.folders[0].children.nodes[0].path += '/unexpected-child'; },
  ]) { const f = fixture(); mutate(f); await assert.rejects(f.service.load(), failsWith('TAXONOMY')); }
  const f = fixture(); f.state.fields[0].fieldId = guid(55);
  await assert.rejects(f.service.load(), failsWith('MODEL'));
  const g = fixture(); g.state.resourceVersion = 3;
  await assert.rejects(g.service.load(), failsWith('MODEL'));
  const h = fixture(); h.state.fieldType = 'Droplist';
  await assert.rejects(h.service.load(), failsWith('MODEL'));
});

test('unknown, empty or additional metadata values are never submitted', async () => {
  const f = fixture(), snapshot = await f.service.load();
  for (const value of ['', 'unknown-state', guid(99)]) {
    await assert.rejects(f.service.save(snapshot, { ...snapshot.values, state: value }), failsWith('SELECTION'));
  }
  await assert.rejects(f.service.save(snapshot, { ...snapshot.values, Title: 'injected' } as MetadataValues), failsWith('SELECTION'));
  assert.equal(f.state.updates.length, 0);
});

test('shared or unversioned field definitions cannot broaden an edit beyond the selected language and version', async () => {
  for (const property of ['fieldShared', 'fieldUnversioned'] as const) {
    for (const value of ['1', undefined, null]) {
      const f = fixture(); f.state[property] = value;
      await assert.rejects(f.service.load(), failsWith('MODEL'));
      assert.equal(f.state.updates.length, 0);

      const g = fixture(), snapshot = await g.service.load(); g.state[property] = value;
      await assert.rejects(g.service.save(snapshot, { ...snapshot.values, state: 'TX' }), failsWith('MODEL'));
      assert.equal(g.state.updates.length, 0);
    }
  }
  const f = fixture(); f.state.fieldShared = '0'; f.state.fieldUnversioned = '0';
  const snapshot = await f.service.load();
  assert.equal(snapshot.editable, true);
  await f.service.save(snapshot, { ...snapshot.values, state: 'TX' });
  assert.equal(f.state.updates.length, 1);
});

test('navigation cancellation immediately before the write prevents submission', async () => {
  const f = fixture(), snapshot = await f.service.load();
  await assert.rejects(f.service.save(snapshot, { ...snapshot.values, state: 'TX' }, { isCurrent: () => false }), failsWith('STALE'));
  assert.equal(f.state.updates.length, 0);
});

test('an uncertain mutation or changed unrelated field requires inspection and cannot be retried with the old form', async () => {
  for (const mode of ['throwAfterWrite', 'corruptAfterWrite'] as const) {
    const f = fixture(), snapshot = await f.service.load(); f.state[mode] = true;
    await assert.rejects(f.service.save(snapshot, { ...snapshot.values, state: 'TX' }), error => {
      assert.equal((error as MetadataError).code, 'SAVE_UNCERTAIN');
      assert.equal(String(error).includes('private transport'), false); return true;
    });
    await assert.rejects(f.service.save(snapshot, { ...snapshot.values, state: 'TX' }), failsWith('STALE'));
    assert.equal(f.state.updates.length, 1);
  }
});

test('a changed workflow is never silently reset or approved', async () => {
  const f = fixture(), snapshot = await f.service.load();
  f.setField('__Workflow state', 'f7fe5bdd-a991-4a58-9735-cd08f9b097ab');
  await assert.rejects(f.service.save(snapshot, { ...snapshot.values, state: 'TX' }), failsWith('READ_ONLY'));
  assert.equal(f.state.updates.length, 0);
});
