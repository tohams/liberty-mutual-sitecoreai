'use strict';
const crypto = require('node:crypto');
const { xmlShape } = require('./configure-product-spotlight.cjs');
const SITE = '/sitecore/content/LibertyMutual/liberty-mutual-agent-portal';
const TEMPLATES = '/sitecore/templates/Project/LibertyMutual';
const BRANCH_PATH = SITE + '/Presentation/Page Branches/Resource page';
const PROTOTYPE_PATH = BRANCH_PATH + '/$name';
const DATA_PATH = PROTOTYPE_PATH + '/Data';
const IMAGE_PATH = DATA_PATH + '/Resource image';
const PLACEHOLDER = 'headless-resource-image';
const NESTED_PLACEHOLDER = '/headless-resource-article/' + PLACEHOLDER;
function uuidV5(name) {
  const bytes = crypto.createHash('sha1').update(Buffer.from('4a098fe0ad6b472298624e56b855337a', 'hex')).update(name).digest().subarray(0, 16);
  bytes[6] = bytes[6] & 15 | 80; bytes[8] = bytes[8] & 63 | 128;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
const IDS = Object.freeze({
  branch: '8376af58-fc32-4894-a57d-fd5e6e966272',
  prototype: 'f88b4735-b33d-4ad4-a0b0-bfe60e657572',
  branchTemplate: '35e75c72-4985-4e09-88c3-0eac6cd1e64f',
  branchFolder: '303950e1-bb10-4155-b993-9435c33f9aeb',
  branchFolderTemplate: 'fbc802e5-4b9e-480f-93da-3f2a80cae5cb',
  pageTemplate: 'e9573e8d-00d6-5fd9-9015-2f0aec4a0b60',
  portalPageTemplate: 'd8e5d742-1ae3-5b2e-aba9-553d4a53c3fc',
  pageDefaults: 'b9063020-dcb9-5e05-9225-9dd340bbcfca',
  portalDefaults: '75da39b9-8616-5479-beca-ee38e5be4753',
  resources: 'c9b4e46b-3b72-50d4-a96e-732c4d181b6a',
  dataTemplate: '1c82e550-ebcd-4e5d-8abd-d50d0809541e',
  data: uuidV5(DATA_PATH), image: uuidV5(IMAGE_PATH),
  imageTemplate: '57ee0749-a33c-50ff-b20b-0337974b7bd6',
  imageField: 'ca9a643a-07b6-5945-8fa5-af13e02af584',
  captionField: 'a8d126c1-34ee-5679-9cf6-8d699a788cd8',
  articleRendering: '980ad02c-08e5-5f27-9f08-f28e829ca94d',
  rendering: '2958922f-9832-5a46-b489-a4408eb363b1',
  placeholder: '74d15b03-b221-57bb-a21c-313a5ce0c461',
  sitePlaceholder: '5ce737cc-1f1d-5aa2-bd70-f8a513967738',
  articleLayout: 'bb11e9d7-11d7-5c71-9ab7-1dd37267c4d3',
  articleVariant: 'b46f708f-be88-5805-9799-e2dd4d37f0aa',
  variant: uuidV5(SITE + '/Presentation/Headless Variants/ResourceImage/Default'),
  available: 'e49da1ae-6054-5b18-b221-384f51d1e376',
  availableTemplate: '76da0a8d-fc7e-42b2-af1e-205b49e43f98',
  device: 'fe5d7fdf-89c0-4d99-9aa3-b5fbd009c9f3',
  ruleField: 'bb3391dd-f8be-4b2e-ae9f-47bb63c166ce',
  itemCondition: '4f5389e9-79b7-4fe1-a43a-eea4ecd19c94',
  equalsOperator: '066602e2-ed1d-44c2-a698-7ed27fd3a2cc',
  branchAction: 'd46ec8e5-7b46-47de-b44a-4c5c30ef48d1',
});
const FIELDS = Object.freeze({
  masters: '1172f251-dad4-4efb-a329-0c63500e4f1e',
  renderings: 'f1a1fe9e-a60c-4ddb-a3a0-bb5b29fe732e',
  placeholders: '069a8361-b1cd-437c-8c32-a3be78941446',
  pageDatasource: 'a3411ff6-c978-40aa-b059-a49b9ca2209b',
  datasourceLocation: 'b5b27af1-25ef-405c-87ce-369b3a004016',
  availableRenderings: '715ae6c0-71c8-4744-ab4f-65362d20ad65',
});
const norm = value => String(value || '').replace(/[{}-]/g, '').toLowerCase();
const brace = value => '{' + value.toUpperCase() + '}';
const ARTICLE_INSTANCE = uuidV5(PROTOTYPE_PATH + '/rendering/ResourceArticle');
const IMAGE_INSTANCE = uuidV5(PROTOTYPE_PATH + '/rendering/ResourceImage');
const RULE_ID = uuidV5(BRANCH_PATH + '/insert-rule');
const RULE_XML = `<rule uid="${brace(RULE_ID)}" name="Resource page beneath Learning and resources"><conditions><condition id="${brace(IDS.itemCondition)}" uid="${brace(uuidV5(BRANCH_PATH + '/condition'))}" operatorid="${brace(IDS.equalsOperator)}" value="${brace(IDS.resources)}" /></conditions><actions><action id="${brace(IDS.branchAction)}" uid="${brace(uuidV5(BRANCH_PATH + '/action'))}" PageBranchId="${brace(IDS.branch)}" /></actions></rule>`;
function branchLayout() {
  return `<r><d id="${brace(IDS.device)}" l="${brace(IDS.articleLayout)}"><r uid="${brace(ARTICLE_INSTANCE)}" id="${brace(IDS.articleRendering)}" ph="headless-resource-article" ds="$id" par="FieldNames=${brace(IDS.articleVariant)}&amp;DynamicPlaceholderId=1" /><r uid="${brace(IMAGE_INSTANCE)}" id="${brace(IDS.rendering)}" ph="${NESTED_PLACEHOLDER}" ds="page:/Data/Resource image" par="FieldNames=${brace(IDS.variant)}&amp;DynamicPlaceholderId=2" /></d></r>`;
}
function appendId(current, id) {
  const ids = String(current || '').split(/[|\r\n]+/).map(x => x.trim()).filter(Boolean);
  if (!ids.every(x => /^\{[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}\}$/i.test(x))) throw new Error('Unsupported multilist value.');
  if (ids.some(x => norm(x) === norm(id))) return current;
  return current + (ids.length ? '|' : '') + brace(id);
}
function appendRule(current) {
  if (!String(current).trim()) return '<ruleset>' + RULE_XML + '</ruleset>';
  const shape = xmlShape(current, 'ruleset');
  const owned = shape[3].filter(node => norm(Object.fromEntries(node[1]).uid) === norm(RULE_ID));
  if (owned.length) {
    if (owned.length !== 1 || JSON.stringify(owned[0]) !== JSON.stringify(xmlShape(RULE_XML, 'rule'))) throw new Error('The resource insert rule was changed; preserve and review it.');
    return current;
  }
  if (!/<\/ruleset>\s*$/.test(current)) throw new Error('Unsupported insert rule XML.');
  return current.replace(/<\/ruleset>\s*$/, RULE_XML + '</ruleset>');
}
module.exports = { SITE, TEMPLATES, BRANCH_PATH, PROTOTYPE_PATH, DATA_PATH, IMAGE_PATH, PLACEHOLDER, NESTED_PLACEHOLDER, IDS, FIELDS, RULE_ID, RULE_XML, ARTICLE_INSTANCE, IMAGE_INSTANCE, uuidV5, norm, brace, branchLayout, appendId, appendRule };
