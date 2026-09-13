'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const { IDS, INSTANCE, NAME, PAGE_PATH, AVAILABLE_PATH, finalLayout, xmlShape, layoutStatus, appendRendering, validateDatasourceLink, normalizeEmptyNeutralLink, acceptGeneratedThumbnail, fieldHash, baselineFrom, planPage, migrate } = require('./configure-product-spotlight.cjs');

const copy = value => structuredClone(value);
const field = (name, value, index) => ({ name, value, fieldId: `0000000000000000000000000000${String(index).padStart(4, '0')}` });
function fixture() {
  const values = {
    __Renderings: `<r><d id="{${IDS.device.toUpperCase()}}" l="{96E5F4BA-A2CF-4A4C-A4E7-64DA88226362}"><r uid="{${IDS.originalInstance.toUpperCase()}}" id="{193A0299-B5B6-5668-B792-9F3552463163}" ph="headless-main" ds="{C9D135C2-E2F2-52F8-8B32-C6E7C7D41C7A}" par="FieldNames={810A4AD9-0C31-5EC4-BC37-006D382BCE44}&amp;DynamicPlaceholderId=1" /></d></r>`,
    '__Final Renderings': '', __Workflow: IDS.pageWorkflow, '__Workflow state': IDS.pageApproved,
    __Lock: '', __Revision: 'baseline-revision', '__Shared revision': 'shared-revision', '__Version Name': '',
    Title: 'Products & appetite', NavigationTitle: 'Products & appetite', '__Valid from': '', __Thumbnail: '', __Created: '20260910T140000Z',
  };
  const baseline = { itemId: IDS.page, path: PAGE_PATH, version: 1, versionName: '',
    template: { templateId: IDS.pageTemplate }, revision: { value: 'baseline-revision' }, sharedRevision: { value: 'shared-revision' },
    versions: [{ version: 1, versionName: '' }], workflow: { canEdit: true, canSave: true, workflow: { initialState: { stateId: IDS.pageDraft } } },
    fields: Object.entries(values).map(([name, value], index) => field(name, value, index)),
  };
  const available = { itemId: IDS.available, path: AVAILABLE_PATH, version: 1, versionName: '',
    template: { templateId: IDS.availableTemplate }, revision: { value: 'available-before' }, sharedRevision: { value: 'available-shared' },
    workflow: null, versions: [{ version: 1, versionName: '' }], fields: [field('Renderings', '{193A0299-B5B6-5668-B792-9F3552463163}', 40), field('__Lock', '', 41), field('__Workflow', '', 42)],
  };
  return { baseline, available };
}
function simulatedApi({ failAfter } = {}) {
  const { baseline, available } = fixture();
  const pages = [copy(baseline)];
  const calls = [];
  const set = (item, name, value) => {
    item.fields.find(field => field.name === name).value = value;
    item.revision.value = 'revision-' + calls.length;
    const revision = item.fields.find(field => field.name === '__Revision');
    if (revision) revision.value = item.revision.value;
  };
  const api = {
    async read(id, version) {
      if (id === IDS.available) return copy(available);
      const item = copy(version ? pages.find(item => item.version === version) : pages.at(-1));
      item.versions = pages.map(({ version, versionName }) => ({ version, versionName }));
      return item;
    },
    async update(item, name, value) {
      calls.push(['update', item.itemId, name]);
      const target = item.itemId === IDS.available ? available : pages.find(page => page.version === item.version);
      set(target, name, value);
      if (failAfter === name) { failAfter = undefined; throw new Error('Simulated uncertain response'); }
    },
    async addVersion() {
      calls.push(['add-version']);
      const next = copy(pages[0]);
      next.version = 2; next.versionName = NAME;
      set(next, '__Version Name', NAME);
      pages.push(next);
      if (failAfter === 'add-version') { failAfter = undefined; throw new Error('Simulated uncertain response'); }
    },
    async startWorkflow(item) {
      calls.push(['start-workflow']);
      set(pages.find(page => page.version === item.version), '__Workflow state', IDS.pageDraft);
      if (failAfter === 'start-workflow') { failAfter = undefined; throw new Error('Simulated uncertain response'); }
      return { startWorkflow: { successful: true } };
    },
  };
  return { api, baseline, pages, available, calls };
}

test('final delta changes only the target device layout and adds one stable rendering', () => {
  assert.match(INSTANCE, /^[a-f\d-]{14}5[a-f\d-]{21}$/);
  const tree = xmlShape(finalLayout());
  assert.equal(tree[3].length, 1);
  const device = tree[3][0];
  assert.equal(Object.fromEntries(device[1])['{s}l'].toLowerCase(), '{' + IDS.layout + '}');
  assert.equal(device[3].length, 1);
  const attributes = Object.fromEntries(device[3][0][1]);
  assert.equal(attributes['{s}ph'], 'headless-products-spotlight');
  assert.equal(attributes['{p}after'], `r[@uid='{${IDS.originalInstance.toUpperCase()}}']`);
  assert.ok(!finalLayout().includes('s:ds="{C9D135C2'));
  assert.equal(layoutStatus(finalLayout()), 'configured');
  assert.throws(() => layoutStatus(finalLayout().replace('DynamicPlaceholderId=2', 'DynamicPlaceholderId=1')), /differs/);
  assert.throws(() => xmlShape('<!DOCTYPE r><r/>'), /Unsupported/);
});

test('available-rendering append preserves existing IDs and is idempotent', () => {
  const original = '{193A0299-B5B6-5668-B792-9F3552463163}|{15CF6EFA-C180-563A-B229-C08F2DAC3DAD}';
  const appended = appendRendering(original);
  assert.equal(appended, original + '|{' + IDS.rendering.toUpperCase() + '}');
  assert.equal(appendRendering(appended), appended);
  assert.throws(() => appendRendering(original + '|unexpected'), /unsupported/);
});

test('datasource approval rejects quoted-empty and malformed General Link values', () => {
  const item = value => ({ fields: [field('actionLink', value, 45)] });
  validateDatasourceLink(item(''));
  validateDatasourceLink(item('<link text="Guide" linktype="external" url="/resources/example" />'));
  assert.throws(() => validateDatasourceLink(item('""')), /General Link/);
  assert.throws(() => validateDatasourceLink(item('<link broken')), /parsed/);
});

test('one-time empty-link correction plans first, preserves other fields and refuses authored links', async () => {
  const item = { itemId: IDS.neutral, path: '/sitecore/content/LibertyMutual/liberty-mutual-agent-portal/Data/ProductSpotlight/neutral',
    template: { templateId: IDS.template }, version: 1, revision: { value: 'before' }, sharedRevision: { value: 'shared' },
    workflow: { canEdit: true, canSave: true }, fields: [field('actionLink', '""', 50), field('__Workflow', IDS.datasourceWorkflow, 51),
      field('__Workflow state', IDS.datasourceDraft, 52), field('headline', 'Unchanged copy', 53)] };
  let writes = 0;
  const api = { read: async () => copy(item), update: async (_, name, value) => { writes++; item.fields.find(field => field.name === name).value = value; } };
  assert.equal((await normalizeEmptyNeutralLink(api, false)).operation, 'replace-literal-two-quotes-with-empty');
  assert.equal(writes, 0);
  await normalizeEmptyNeutralLink(api, true);
  assert.equal(writes, 1);
  assert.equal((await normalizeEmptyNeutralLink(api, true)).operation, 'already-empty');
  assert.equal(writes, 1);
  item.fields[0].value = '<link url="/authored" />';
  await assert.rejects(normalizeEmptyNeutralLink(api, true), /authored content/);
  assert.equal(writes, 1);
});

test('reviewed baseline validation rejects a different page or modified snapshot', () => {
  const { baseline } = fixture();
  const snapshot = { database: 'master', language: 'en', items: { productsPage: { item: baseline, fields: baseline.fields, fieldsSha256: fieldHash(baseline.fields) } } };
  assert.equal(baselineFrom(snapshot).version, 1);
  snapshot.items.productsPage.fieldsSha256 = 'changed';
  assert.throws(() => baselineFrom(snapshot), /checksum/);
});

test('dry run performs no mutations; apply preserves source and rerun creates no duplicate', async () => {
  const state = simulatedApi();
  assert.equal((await migrate({ ...state, apply: false })).page.action, 'create-named-draft');
  assert.deepEqual(state.calls, []);
  const sourceHash = fieldHash(state.pages[0].fields);
  await migrate({ ...state, apply: true });
  assert.equal(state.pages.length, 2);
  assert.equal(fieldHash(state.pages[0].fields), sourceHash);
  assert.equal(state.pages[1].fields.find(field => field.name === '__Workflow state').value, IDS.pageDraft);
  const previousCalls = state.calls.length;
  assert.equal((await migrate({ ...state, apply: true })).page.action, 'already-configured');
  assert.equal(state.calls.length, previousCalls);
});

for (const failAfter of ['Renderings', 'add-version', 'start-workflow', '__Final Renderings']) {
  test('resume is safe after an uncertain ' + failAfter + ' response', async () => {
    const state = simulatedApi({ failAfter });
    const stages = [];
    await assert.rejects(migrate({ ...state, apply: true, record: stage => stages.push(stage) }), /Simulated/);
    assert.ok(stages.length > 1, 'Intent was recorded before the failed response');
    await migrate({ ...state, apply: false });
    await migrate({ ...state, apply: true });
    assert.equal(state.pages.length, 2);
    assert.equal(state.calls.filter(call => call[0] === 'add-version').length, 1);
    assert.equal(state.pages[1].fields.find(field => field.name === '__Final Renderings').value, finalLayout());
  });
}

test('partial version with unrelated author changes is preserved and rejected', async () => {
  const state = simulatedApi({ failAfter: 'add-version' });
  await assert.rejects(migrate({ ...state, apply: true }));
  state.pages[1].fields.find(field => field.name === 'Title').value = 'An author changed this';
  const writes = state.calls.length;
  await assert.rejects(migrate({ ...state, apply: true }), /outside the planned/);
  assert.equal(state.calls.length, writes);
});

test('native version initialization accepts only Valid from equal to the new creation timestamp', async () => {
  const state = simulatedApi({ failAfter: 'add-version' });
  await assert.rejects(migrate({ ...state, apply: true }));
  const latest = state.pages[1];
  latest.fields.find(field => field.name === '__Created').value = '20260913T041431Z';
  latest.fields.find(field => field.name === '__Valid from').value = '20260913T041431Z';
  assert.equal((await migrate({ ...state, apply: false })).page.action, 'resume-named-draft');
  latest.fields.find(field => field.name === '__Valid from').value = '20270913T041431Z';
  await assert.rejects(migrate({ ...state, apply: true }), /availability date/);
});

test('only the native Products thumbnail path can fill the initially empty shared thumbnail', async () => {
  const { baseline } = fixture();
  const current = copy(baseline);
  const thumb = '<image mediaid="{BBFD6923-803C-48D9-A51F-36F2D6A30AAC}" />';
  current.fields.find(field => field.name === '__Thumbnail').value = thumb;
  const media = { itemId: 'bbfd6923-803c-48d9-a51f-36f2d6a30aac', template: { templateId: 'f1828a2c-7e5d-4bbd-98ca-320474871548' },
    path: '/sitecore/media library/Project/LibertyMutual/liberty-mutual-agent-portal/System/D/8/8/9/thumbnail_D8898B9567205ACF86B6B434C3FE7F57' };
  const api = { readThumbnail: async () => media };
  const accepted = await acceptGeneratedThumbnail(api, baseline, current);
  assert.equal(accepted.fields.find(field => field.name === '__Thumbnail').value, thumb);
  assert.equal(baseline.fields.find(field => field.name === '__Thumbnail').value, '');
  media.path = '/sitecore/media library/Project/LibertyMutual/authored-banner';
  await assert.rejects(acceptGeneratedThumbnail(api, baseline, current), /not the native generated/);
});

test('duplicate named versions or a locked target prevent a new migration', () => {
  const { baseline } = fixture();
  const locked = copy(baseline);
  locked.fields.find(field => field.name === '__Lock').value = '<r owner="author" />';
  // Same revision with different lock content must first fail the baseline guard.
  assert.throws(() => planPage(baseline, locked), /changed/);
  const duplicate = copy(baseline);
  duplicate.versions = [{ version: 2, versionName: NAME }, { version: 3, versionName: NAME }];
  assert.throws(() => planPage(baseline, duplicate), /Multiple named/);
});
