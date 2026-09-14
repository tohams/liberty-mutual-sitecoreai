'use strict';
// Pure, guarded presentation-data migration. No credentials, network, file
// writes, publication, or workflow operations. Python 3 validates XML using the
// standard library; lexical replacement preserves every other source byte.
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

const SITE = '/sitecore/content/LibertyMutual/liberty-mutual-agent-portal/Home';
const MODEL = '/sitecore/templates/Project/LibertyMutual';
const IDS = Object.freeze({
  device: 'fe5d7fdf89c04d999aa3b5fbd009c9f3',
  originalLayout: '96e5f4baa2cf4a4ca4e764da88226362',
  pageTemplate: '2ec94e3d439c4fc6bd4ef08c7ddd9203',
  portalTemplate: 'd8e5d7421ae35b2eaba9553d4a53c3fc',
  resourceTemplate: 'e9573e8d00d65fd990152f0aec4a0b60',
  sharedField: 'f1a1fe9ea60c4ddba3a0bb5b29fe732e',
  finalField: '04bf00dbf5fb41f78ab722408372a981',
});
const LAYOUTS = Object.freeze({
  PortalLayout: '3d40b9c9-8126-5ff8-81e1-a48afb1ba1a8',
  ResourcesLayout: '2dac85b2-7271-519e-a454-5a841ac1ad0d',
  ResourceArticleLayout: 'bb11e9d7-11d7-5c71-9ab7-1dd37267c4d3',
  ProductsLayout: '75cfc4f6-9a69-52b3-97c3-11a6f1fabe89',
});
const COMPONENTS = Object.freeze({
  '193a0299b5b65668b7929f3552463163': { name: 'AgentGuidance', from: 'headless-main', to: 'headless-agent-guidance' },
  '15cf6efac180563ab229c08f2dac3dad': { name: 'ResourceSearch', from: 'headless-main', to: 'headless-resource-search' },
  '980ad02c08e55f279f08f28e829ca94d': { name: 'ResourceArticle', from: 'headless-main', to: 'headless-resource-article' },
  '1962d596418751c9a91f4d39a9318b51': { name: 'ProductSpotlight', from: 'headless-products-spotlight', to: 'headless-products-spotlight' },
});
const TAG = /<[rd](?=[\s/>])(?:[^"'<>]|"[^"]*"|'[^']*')*>/g;
const ATTRIBUTE = /([\w:.-]+)(\s*=\s*)(["'])([\s\S]*?)\3/g;
const norm = value => String(value || '').replace(/[{}-]/g, '').toLowerCase();
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const fail = message => { throw new Error('Portal placeholders: ' + message); };
const insist = (condition, message) => { if (!condition) fail(message); };
const guid = value => /^[a-f\d]{32}$/.test(norm(value));
const braces = value => '{' + value.toUpperCase() + '}';

function resolvePolicy({ path, templateId }) {
  const template = norm(templateId);
  let layout;
  if (path === MODEL + '/Page/__Standard Values') {
    insist(template === IDS.pageTemplate, 'Unexpected Page standard-values template.');
    layout = 'PortalLayout';
  } else if (path === MODEL + '/PortalPage/__Standard Values') {
    insist(template === IDS.portalTemplate, 'Unexpected PortalPage standard-values template.');
    layout = 'PortalLayout';
  } else if (path === MODEL + '/ResourcePage/__Standard Values') {
    insist(template === IDS.resourceTemplate, 'Unexpected ResourcePage standard-values template.');
    layout = 'ResourceArticleLayout';
  } else if (path === SITE) {
    insist(template === IDS.pageTemplate, 'Unexpected Home template.');
    layout = 'PortalLayout';
  } else if (path === SITE + '/resources' || path === SITE + '/products') {
    insist(template === IDS.portalTemplate, 'Unexpected portal index template.');
    layout = path.endsWith('/resources') ? 'ResourcesLayout' : 'ProductsLayout';
  } else if (typeof path === 'string' && path.startsWith(SITE + '/resources/')) {
    insist(template === IDS.resourceTemplate && /^[a-z0-9-]+$/.test(path.slice((SITE + '/resources/').length)), 'Unexpected resource page path or template.');
    layout = 'ResourceArticleLayout';
  } else if (typeof path === 'string' && path.startsWith(SITE + '/')) {
    insist(template === IDS.portalTemplate && /^[a-z0-9-]+(?:\/[a-z0-9-]+)*$/.test(path.slice(SITE.length + 1)), 'Unexpected portal page path or template.');
    layout = 'PortalLayout';
  } else fail('Item is outside the supported owned page/standard-values scope.');
  const allowed = {
    PortalLayout: ['AgentGuidance'], ResourcesLayout: ['ResourceSearch', 'AgentGuidance'],
    ResourceArticleLayout: ['ResourceArticle'], ProductsLayout: ['AgentGuidance', 'ProductSpotlight'],
  }[layout];
  return { name: layout, layoutId: LAYOUTS[layout], allowedComponents: allowed };
}

function xmlShape(xml) {
  insist(typeof xml === 'string' && xml.length <= 262144, 'Invalid or oversized layout XML.');
  if (!xml.trim()) return null;
  insist(!/<!/.test(xml), 'DTD, entity declarations, comments and other declarations are unsupported.');
  const parser = `import json,sys,xml.etree.ElementTree as E
def node(x):
 return {'tag':x.tag,'attrs':dict(x.attrib),'text':x.text or '', 'tail':x.tail or '', 'children':[node(c) for c in x]}
try:
 r=E.fromstring(sys.stdin.read())
 if r.tag!='r': raise ValueError('Invalid root')
 print(json.dumps(node(r)))
except Exception:
 sys.exit(2)
`;
  const result = spawnSync('python3', ['-c', parser], { input: xml, encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 });
  insist(result.status === 0 && !result.error, 'Layout XML could not be parsed; Python 3 is required.');
  return JSON.parse(result.stdout);
}

function attr(node, key) {
  const direct = node.attrs[key], namespaced = node.attrs['{s}' + key];
  insist(!(direct !== undefined && namespaced !== undefined), 'Ambiguous namespaced layout attribute.');
  return namespaced === undefined ? direct : namespaced;
}

function inspect(shape, policy, uidMap, isFinal) {
  if (!shape) { insist(isFinal, 'Shared layout must not be empty.'); return; }
  insist(shape.children.length === 1 && shape.children[0].tag === 'd', 'Expected exactly one default device.');
  const device = shape.children[0];
  insist(guid(attr(device, 'id')) && norm(attr(device, 'id')) === IDS.device, 'Unexpected device; only the default device is supported.');
  const layout = attr(device, 'l');
  insist(isFinal || !!layout, 'Shared layout must declare its layout.');
  if (layout !== undefined) insist(guid(layout) && [IDS.originalLayout, norm(policy.layoutId)].includes(norm(layout)), 'Unexpected existing layout assignment.');
  const seen = new Set();
  for (const rendering of device.children) {
    insist(rendering.tag === 'r', 'Unsupported device child; inspect placeholder overrides or presentation data.');
    const uid = norm(attr(rendering, 'uid'));
    insist(guid(uid) && !seen.has(uid), 'Missing or duplicate rendering UID.'); seen.add(uid);
    const explicit = attr(rendering, 'id');
    const id = explicit === undefined ? uidMap.get(uid) : norm(explicit);
    insist(id && COMPONENTS[id], 'Unknown rendering or final-layout UID.');
    insist(policy.allowedComponents.includes(COMPONENTS[id].name), 'Rendering is not allowed on this page role.');
    if (uidMap.has(uid)) insist(uidMap.get(uid) === id, 'Final layout changes a rendering component for an existing UID.');
    insist(isFinal || explicit !== undefined, 'Shared rendering must declare its component ID.');
    const ph = attr(rendering, 'ph');
    insist(ph !== undefined || (isFinal && uidMap.has(uid)), 'Rendering is missing its placeholder.');
    if (ph !== undefined) insist([COMPONENTS[id].from, COMPONENTS[id].to].includes(ph), 'Unexpected placeholder value.');
    uidMap.set(uid, id);
  }
}

function attributes(tag) { return Object.fromEntries([...tag.matchAll(ATTRIBUTE)].map(match => [match[1], match[4]])); }
function protectedBytes(xml) {
  return xml.replace(TAG, tag => tag.replace(ATTRIBUTE, (full, name, equals, quote) =>
    ((tag.startsWith('<d') && ['l', 's:l'].includes(name)) ||
      (tag.startsWith('<r') && ['ph', 's:ph'].includes(name))) ? name + equals + quote + '#PLACEMENT#' + quote : full));
}
function protectedShape(shape) {
  if (!shape) return null;
  const copy = structuredClone(shape);
  for (const device of copy.children) {
    for (const key of ['l', '{s}l']) if (device.attrs[key] !== undefined) device.attrs[key] = '#PLACEMENT#';
    for (const rendering of device.children) for (const key of ['ph', '{s}ph']) {
      if (rendering.attrs[key] !== undefined) rendering.attrs[key] = '#PLACEMENT#';
    }
  }
  return copy;
}

function rewrite(xml, policy, uidMap, field, changes) {
  return xml.replace(TAG, tag => {
    const values = attributes(tag), uid = norm(values.uid || values['s:uid']);
    const component = COMPONENTS[uidMap.get(uid)];
    return tag.replace(ATTRIBUTE, (full, name, equals, quote, value) => {
      let target;
      if (tag.startsWith('<d') && ['l', 's:l'].includes(name)) target = braces(policy.layoutId);
      if (tag.startsWith('<r') && ['ph', 's:ph'].includes(name)) { insist(component, 'Placeholder has no recognized rendering UID.'); target = component.to; }
      if (target === undefined || value === target) return full;
      changes.push({ field, attribute: name, ...(uid ? { uid } : {}), before: value, after: target });
      return name + equals + quote + target + quote;
    });
  });
}

function transformLayoutPair({ path, templateId, sharedLayout, finalLayout = '' }) {
  const policy = resolvePolicy({ path, templateId });
  const sharedShape = xmlShape(sharedLayout), finalShape = xmlShape(finalLayout);
  const uidMap = new Map();
  inspect(sharedShape, policy, uidMap, false);
  inspect(finalShape, policy, uidMap, true);
  const changes = [];
  const shared = rewrite(sharedLayout, policy, uidMap, '__Renderings', changes);
  const final = rewrite(finalLayout, policy, uidMap, '__Final Renderings', changes);
  for (const [before, after, originalShape] of [[sharedLayout, shared, sharedShape], [finalLayout, final, finalShape]]) {
    insist(protectedBytes(before) === protectedBytes(after), 'Non-placement source bytes changed.');
    const afterShape = xmlShape(after);
    insist(JSON.stringify(protectedShape(originalShape)) === JSON.stringify(protectedShape(afterShape)), 'Non-placement XML semantics changed.');
  }
  return {
    policy, sharedLayout: shared, finalLayout: final, changed: changes.length > 0, changes,
    protectedSharedSha256: digest(protectedBytes(sharedLayout)), protectedFinalSha256: digest(protectedBytes(finalLayout)),
  };
}

function planItemLayouts(item) {
  insist(item?.path && item.template?.templateId && Array.isArray(item.versions) && item.versions.length, 'Invalid native item snapshot.');
  const field = (version, name) => version.fields.find(entry => entry.name === name);
  const plans = item.versions.map(version => {
    const shared = field(version, '__Renderings'), final = field(version, '__Final Renderings');
    insist(shared && final && norm(shared.fieldId) === IDS.sharedField && norm(final.fieldId) === IDS.finalField, 'Missing expected presentation fields.');
    const result = transformLayoutPair({ path: item.path, templateId: item.template.templateId, sharedLayout: shared.value, finalLayout: final.value });
    return { language: typeof version.language === 'string' ? version.language : version.language.name, version: version.version,
      beforeSharedLayout: shared.value, beforeFinalLayout: final.value, ...result };
  });
  insist(new Set(plans.map(plan => plan.beforeSharedLayout)).size === 1 && new Set(plans.map(plan => plan.sharedLayout)).size === 1,
    'Shared layout differs across versions; inspect inherited/raw presentation values before continuing.');
  return {
    itemId: item.itemId, path: item.path, templateId: item.template.templateId, policy: plans[0].policy,
    sharedChange: plans[0].beforeSharedLayout === plans[0].sharedLayout ? null : {
      fieldId: IDS.sharedField, name: '__Renderings', before: plans[0].beforeSharedLayout, after: plans[0].sharedLayout,
      beforeSha256: digest(plans[0].beforeSharedLayout), afterSha256: digest(plans[0].sharedLayout),
    },
    finalChanges: plans.filter(plan => plan.beforeFinalLayout !== plan.finalLayout).map(plan => ({
      fieldId: IDS.finalField, name: '__Final Renderings', language: plan.language, version: plan.version,
      before: plan.beforeFinalLayout, after: plan.finalLayout, beforeSha256: digest(plan.beforeFinalLayout), afterSha256: digest(plan.finalLayout),
    })),
    versions: plans,
  };
}

function assertRollbackSafe(currentValue, appliedValue, originalValue) {
  insist(currentValue === appliedValue || currentValue === originalValue, 'Rollback conflict: presentation changed after migration.');
  return originalValue;
}

module.exports = { IDS, LAYOUTS, COMPONENTS, resolvePolicy, xmlShape, transformLayoutPair, planItemLayouts, assertRollbackSafe };
