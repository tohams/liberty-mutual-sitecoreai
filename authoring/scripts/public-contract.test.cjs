'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const model=require('../items/liberty-mutual-public/public-contract.json');
const SITE=model.sitePath;
const record=p=>model.records.find(r=>r.path===p);
const norm=s=>s.replace(/[{}-]/g,'').toLowerCase();
test('native identifiers and references are unique and limited to this customer model',()=>{
 assert.equal(new Set(model.records.map(i=>norm(i.id))).size,model.records.length);
 assert.equal(record(SITE).id,model.siteId);
 for(const [name,id]of Object.entries(model.renderingIds)){
  const r=record('/sitecore/layout/Renderings/Project/LibertyMutualPublic/'+name);
  assert.equal(r.id,id);assert.equal(r.fields.componentName,name);
 }
 assert.equal(norm(record(SITE+'/Data/Promotions/Bundle and save').fields.disclosure),norm(model.disclosureId));
});
test('one shared Promotion is assigned to Home and Bundling, with different variants',()=>{
 const home=record(SITE+'/Home').fields.__Renderings;
 const bundling=record(SITE+'/Home/bundling').fields.__Renderings;
 for(const layout of [home,bundling]){
  assert(layout.includes(model.promotionId.toUpperCase()));
  assert(layout.includes(model.disclosureId.toUpperCase()));
 }
 assert(home.includes(model.variantIds['PublicPromotion.Default'].toUpperCase()));
 assert(bundling.includes(model.variantIds['PublicPromotion.Compact'].toUpperCase()));
});
test('new page branch has independent, blank local content and governed placeholders',()=>{
 const p=SITE+'/Presentation/Page Branches/Landing page/$name';
 assert(record(p+'/Data'));
 for(const name of ['Hero','Introduction']){
  const content=record(p+'/Data/'+name);
  for(const [field,value]of Object.entries(content.fields))if(!field.startsWith('__'))assert.equal(value,'',`${name}.${field} must be blank`);
 }
 assert(record(p).fields.__Renderings.includes('page:/Data/Hero'));
 for(const [key,names]of Object.entries(model.placeholders)){
  assert(names.length,`${key} must have an allowlist`);
  assert(names.every(name=>model.renderingIds[name]));
 }
 assert(!model.placeholders['headless-public-content-{*}'].includes('PublicHeader'));
 assert(!model.placeholders['headless-public-hero-{*}'].includes('PublicArticle'));
});
test('all public editorial seed items start in the declared workflow Draft',()=>{
 const dataIds=new Set(Object.entries(model.templateIds).filter(([name])=>name!=='PublicRenderingParameters').map(([,id])=>id));
 for(const r of model.records.filter(r=>dataIds.has(r.template)&&!r.path.endsWith('/__Standard Values'))){
  assert.equal(norm(r.fields.__Workflow),norm(model.workflow.id),r.path);
  assert.equal(norm(r.fields['__Workflow state']),norm(model.workflow.draft),r.path);
 }
});
test('ordinary definition modules exclude editorial Home and shared Data',()=>{
 for(const name of ['PublicModel','PublicPresentation']){
  const module=JSON.parse(fs.readFileSync(path.join(__dirname,'../items/liberty-mutual-public/LibertyMutual.'+name+'.module.json')));
  for(const include of module.items.includes){
   assert(!include.path.startsWith(SITE+'/Home'));
   assert(!include.path.startsWith(SITE+'/Data'));
  }
 }
 for(const name of ['PublicContentSeed','PublicBranchSeed','PublicSiteSeed']){
  const module=JSON.parse(fs.readFileSync(path.join(__dirname,'../items/liberty-mutual-public/LibertyMutual.'+name+'.module.json')));
  assert(module.items.includes.every(i=>i.allowedPushOperations==='CreateOnly'));
 }
});
test('ordinary Deploy installs developer definitions and preserves editorial/host ownership',()=>{
 const build=JSON.parse(fs.readFileSync(path.join(__dirname,'../../xmcloud.build.json')));
 const modules=build.deployItems.modules;
 for(const name of ['PublicModel','PublicPresentation','PublicPartialPlaceholders','PublicWorkflow','PortalRelevancePresentation'])assert(modules.includes('LibertyMutual.'+name),name);
 assert(modules.every(name=>!/(?:Seed|Bootstrap|\.Content)$/.test(name)));
 assert(!modules.includes('nextjs-starter'),'An inherited shared Default host must not be redeployed.');
 const content=JSON.parse(fs.readFileSync(path.join(__dirname,'../items/liberty-mutual/LibertyMutual.Content.module.json')));
 const ignored=content.items.includes[0].rules.filter(r=>r.scope==='Ignored').map(r=>r.path);
 assert(ignored.includes('/liberty-mutual-public-site'));
 assert(ignored.includes('/liberty-mutual-agent-portal/Data/Agency priorities'));
 for(const name of ['AgencyPriorities','SharedDisclosure'])assert(ignored.includes('/liberty-mutual-agent-portal/Presentation/Headless Variants/'+name));
 for(const key of ['headless-agency-priorities','headless-shared-disclosure'])assert(ignored.includes('/liberty-mutual-agent-portal/Presentation/Placeholder Settings/'+key));
});
test('factory Search mapping uses the native fourteen-field technical schema, with stable IDs outside fields',()=>{
 const keys=new Set(['title','question','summary','body','canonicalurl','sourceurl','nextstepurl','revision','owner','effectivedate','reviewdate','state','product','audience']);
 assert.equal(keys.size,14);
 const config=JSON.parse(record(SITE+'/Data/Search/Consumer knowledge').fields.search);
 assert.equal(config.searchIndex,'f527245d-98c7-4978-8802-237d7717ca43');
 assert(Object.values(config.fieldsMapping).every(key=>keys.has(key)&&key===key.toLowerCase()));
 assert.equal(config.fieldsMapping.link,'canonicalurl');assert.equal(config.fieldsMapping.source,'sourceurl');assert.equal(config.fieldsMapping.effectiveDate,'effectivedate');
 assert(!Object.values(config.fieldsMapping).includes('id'));
});
