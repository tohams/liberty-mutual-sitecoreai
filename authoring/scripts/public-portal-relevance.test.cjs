'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const m=require('../items/liberty-mutual-public/portal-relevance-contract.json');
const {appendIds,appendPlacements,placement}=require('./public-configure-portal-relevance.cjs');
const old='<r><d id="{FE5D7FDF-89C0-4D99-9AA3-B5FBD009C9F3}" l="{11111111-1111-4111-8111-111111111111}"><r uid="{22222222-2222-4222-8222-222222222222}" id="{33333333-3333-4333-8333-333333333333}" ph="headless-agent-guidance" ds="{44444444-4444-4444-8444-444444444444}" par="Existing=untouched&amp;DynamicPlaceholderId=1" /></d></r>';
const inserted=placement(m,'AgencyPriorities','headless-agency-priorities',m.instances.homePriorities,m.datasources.neutral.id,80);
test('an additive slot preserves every existing shared-layout byte and is idempotent',()=>{
 const after=appendPlacements(old,[inserted]);
 assert.equal(after.replace(inserted,''),old);
 assert.equal(appendPlacements(after,[inserted]),after);
});
test('an owned UID with changed authored selection cannot be overwritten',()=>{
 const after=appendPlacements(old,[inserted]);
 const changed=inserted.replace(m.datasources.neutral.id.toUpperCase(),m.datasources.principal.id.toUpperCase());
 assert.throws(()=>appendPlacements(after,[changed]),/changed/);
});
test('layout placeholder references are additive and cannot duplicate existing IDs',()=>{
 const first='{11111111-1111-4111-8111-111111111111}';
 const ids=[m.placeholderIds['headless-agency-priorities'].global,m.placeholderIds['headless-shared-disclosure'].global];
 const after=appendIds(first,ids);
 assert(after.startsWith(first+'|'));
 assert.equal(appendIds(after,ids),after);
 assert.throws(()=>appendIds('unsupported query',ids));
});
test('audience collections share real ordered card references and separate state-specific emphasis',()=>{
 const records=m.records,field=(r,n)=>r.Languages[0].Versions[0].Fields.find(f=>f.Hint===n)?.Value;
 const find=key=>records.find(r=>r.ID===m.datasources[key].id);
 const refs=key=>field(find(key),'Recommendations').split('|').map(x=>x.replace(/[{}]/g,'').toLowerCase());
 assert.equal(refs('principal')[0],m.recommendations['Small business growth']);
 assert.equal(refs('producer')[0],m.recommendations['Home and auto conversations']);
 assert(refs('principal').includes(m.recommendations['Texas workers compensation']));
 assert(refs('producer').includes(m.recommendations['Illinois workers compensation']));
 assert(!refs('neutral').includes(m.recommendations['Texas workers compensation']));
 assert(!refs('neutral').includes(m.recommendations['Illinois workers compensation']));
});
