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
test('Home uses the shared Promotion while Bundling retains only its genuine source content',()=>{
 const home=record(SITE+'/Home').fields.__Renderings;
 const bundling=record(SITE+'/Home/bundling').fields.__Renderings;
 assert(home.includes(model.promotionId.toUpperCase()));
 assert(home.includes(model.variantIds['PublicPromotion.ImageLeft'].toUpperCase()));
 assert(!bundling.includes(model.promotionId.toUpperCase()));
 assert(!bundling.includes(model.disclosureId.toUpperCase()));
 const products=record(SITE+'/Home/bundling').fields.product;
 assert.equal(products,'{2DC9A2FF-F885-4C9D-92A5-75C1306B6FCD}|{67EB1C7D-4DC4-4F43-AF28-DADCDA50EC59}|{005D71B8-6FD7-4E0A-842A-338DF40E1F47}|{D81D3AE8-243B-4F32-B70D-33796448DCA0}');
});
test('Bundling jump links reference the native page instead of an empty external URL',()=>{
 const page=record(SITE+'/Home/bundling');
 const links=model.records.filter(r=>r.path.startsWith(SITE+'/Home/bundling/Data/Bundle introduction/Cards/')&&r.fields.actionLink).map(r=>r.fields.actionLink);
 links.push(record(SITE+'/Home/bundling/Data/Why bundle').fields.primaryLink);
 assert.equal(links.length,4);
 for(const link of links){
  assert(link.includes('linktype="internal"'));
  assert(link.includes('id="{'+page.id.toUpperCase()+'}"'));
  assert(/anchor="[a-z-]+"/.test(link));
  assert(!link.includes('url=""'));
 }
});
test('one full copyright notice is governed in the shared footer without replacing coverage terms',()=>{
 const copyright=record(SITE+'/Data/Disclosures/Copyright notice');
 assert.equal(copyright.id,'9dc572ee-3d67-5909-922f-6482def1cdb0');
 assert.equal(model.copyrightId,copyright.id);
 assert.notEqual(model.copyrightId,model.disclosureId);
 assert.equal(copyright.fields.title,'Copyright notice');
 assert.equal(copyright.fields.sourceLink,'');assert.equal(copyright.fields.owner,'');
 const snapshot=JSON.parse(fs.readFileSync(path.join(__dirname,'../items/liberty-mutual-public/public-editorial-records.json')));
 const fullCopyright='<p>© 2025 Liberty Mutual Insurance, 175 Berkeley Street, Boston, MA 02116<br>Liberty Mutual is an <a href="https://www.libertymutualgroup.com/about-lm/our-company/equal-employment-opportunity-and-anti-discrimination-policy">Equal Opportunity Employer</a> and an Equal Housing Insurer.</p>';
 assert.equal(copyright.fields.body,fullCopyright);
 const copyrightSeed=snapshot.records.find(r=>r.ID===copyright.id);
 assert.equal(copyrightSeed.Languages[0].Versions[0].Fields.find(f=>f.Hint==='body').Value,fullCopyright);
 const footerSeed=snapshot.records.find(r=>r.Path===SITE+'/Presentation/Partial Designs/Footer/Data/Footer');
 assert(footerSeed.Languages.every(l=>l.Versions.every(v=>v.Fields.every(f=>f.Hint!=='body'))));
 assert.equal(record(SITE+'/Presentation/Partial Designs/Footer/Data/Footer').fields.body,undefined);
 assert.equal(model.fieldIds['PublicFooter.body'],undefined);
 assert.equal(record('/sitecore/templates/Project/LibertyMutualPublic/PublicFooter/Content/body'),undefined);
 assert.equal(record(SITE+'/Data/Disclosures/Product availability notice').id,model.disclosureId);
 assert(record(SITE+'/Data/Disclosures/Product availability notice').fields.body.includes('Coverage, discounts, and availability vary by state'));
 assert.equal(norm(record(SITE+'/Data/Promotions/Bundle and save').fields.disclosure),norm(model.disclosureId));
 const resources=model.records.filter(r=>r.template===model.templateIds.PublicResourcePage&&r.path.startsWith(SITE+'/Home/insurance-resources/'));
 assert(resources.length);assert(resources.every(r=>norm(r.fields.disclosure)===norm(model.disclosureId)));
 const copyrightVariant='6fd9eeaf-a76a-52ee-a1fb-8fbdeb534fbb';
 assert.equal(model.variantIds['SharedDisclosure.Copyright'],copyrightVariant);
 assert.equal(record(SITE+'/Presentation/Headless Variants/SharedDisclosure/Copyright').id,copyrightVariant);
 const footer=record(SITE+'/Presentation/Partial Designs/Footer');
 assert.equal(footer.fields.Signature,'public-footer');
 for(const key of ['__Renderings','__Final Renderings']){
  const layout=footer.fields[key];
  assert(layout.includes('D86337AA-4CE4-55F9-9B6F-F4A18C90009A'));
  assert(layout.includes('/headless-footer/headless-public-copyright-1'));
  assert(layout.includes(model.copyrightId.toUpperCase()));
  assert(layout.includes(copyrightVariant.toUpperCase()));
 }
 const global='/sitecore/layout/Placeholder Settings/Project/LibertyMutualPublic/headless-public-copyright';
 const site=SITE+'/Presentation/Placeholder Settings/headless-public-copyright';
 for(const p of [global,site]){
  assert.equal(record(p).fields['Placeholder Key'],'headless-public-copyright-{*}');
  assert.equal(norm(record(p).fields['Allowed Controls']),norm(model.renderingIds.SharedDisclosure));
 }
 assert.equal(norm(record('/sitecore/layout/Renderings/Project/LibertyMutualPublic/PublicFooter').fields.Placeholders),norm(record(global).id));
 assert.equal(record('/sitecore/layout/Renderings/Project/LibertyMutualPublic/PublicFooter').fields.OtherProperties,'IsRenderingsWithDynamicPlaceholders=true');
 assert.deepEqual(model.placeholders['headless-public-copyright-{*}'],['SharedDisclosure']);
 for(const page of model.records.filter(r=>r.path.startsWith(SITE+'/Home')&&r.fields.__Renderings)){
  const nodes=page.fields.__Renderings.match(/<r\s[^>]*\/\s*>/g)||[];
  assert(nodes.every(node=>!(node.includes(model.renderingIds.SharedDisclosure.toUpperCase())&&node.includes(model.disclosureId.toUpperCase()))),page.path);
 }
});
test('promotion image-position variants preserve existing native identities with clear labels',()=>{
 const root=SITE+'/Presentation/Headless Variants/PublicPromotion/';
 const positions=[['ImageLeft','Image left','5d5b9527-e2e8-5c4f-b1ff-d38f7588caf1'],['ImageRight','Image right','9740e635-3b9f-57fa-a134-72a97c4addfa']];
 for(const [name,label,id]of positions){
  assert.equal(model.variantIds['PublicPromotion.'+name],id);
  assert.equal(record(root+name).id,id);
  assert.equal(record(root+name).fields['__Display name'],label);
 }
 assert.equal(record(root+'Default'),undefined);
 assert.equal(record(root+'Compact'),undefined);
});
test('new page branch has independent, blank local content and governed placeholders',()=>{
 const p=SITE+'/Presentation/Page Branches/Landing page/$name';
 assert(record(p+'/Data'));
 for(const name of ['Hero','Introduction']){
  const content=record(p+'/Data/'+name);
  for(const [field,value]of Object.entries(content.fields))if(!field.startsWith('__'))assert.equal(value,'',`${name}.${field} must be blank`);
 }
 assert(record(p).fields.__Renderings.includes('page:/Data/Hero'));
 assert(record(p).fields.__Renderings.includes('page:/Data/Introduction'));
 for(const name of ['PublicHero','PublicArticle']){
  const rendering=record('/sitecore/layout/Renderings/Project/LibertyMutualPublic/'+name);
  assert.equal(rendering.fields['Datasource Location'],'query:./Data');
  assert.equal(rendering.fields['Datasource Template'],'/sitecore/templates/Project/LibertyMutualPublic/'+name);
 }
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


test('structured resources are page-owned and preserve native identities without a second content library',()=>{
 const resourceId='b99218ea-e1fd-41af-a4ae-7ec9e5c30b17';
 assert.equal(model.templateIds.PublicResourcePage,resourceId);
 assert.equal(model.templateIds.ResourceFields,'deb9d373-cca7-4f18-a2fd-a56602b59497');
 assert(!model.templateIds.PublicApprovedAnswer);
 assert(model.records.every(r=>!r.path.startsWith(SITE+'/Data/Approved answers')&&!r.path.includes('/PublicApprovedAnswer')));
 const pages=model.records.filter(r=>r.template===resourceId&&r.path.startsWith(SITE+'/Home/insurance-resources/'));
 assert.equal(pages.length,9);
 for(const page of pages){
  assert(page.path.startsWith(SITE+'/Home/insurance-resources/'));
  for(const key of ['question','answer','formalWording','explanation','owner','effectiveDate','reviewDate','nextStep','disclosure'])assert.equal(typeof page.fields[key],'string',page.path+': '+key);
  for(const key of ['canonicalUrl','sourceLink','state','product','audience'])assert.equal(typeof page.fields[key],'string');
  assert.equal(page.fields.includeInSearch,'1');
  const component=page.fields.__Renderings.match(/<r\s[^>]*id="\{4585A48F-E841-50CA-B2A3-0D3FC9893875\}"[^>]*>/i);
  assert(component,page.path);assert(component[0].includes('ds="{'+page.id.toUpperCase()+'}"'));
 }
 assert(!record(SITE+'/Home/insurance-resources/bundle-car-and-home'),'The duplicate article is retired.');
 const faq=record(SITE+'/Home/bundling/Data/FAQs');
 const selected=faq.fields.items.split('|').map(norm);
 assert.equal(selected.length,6);
 assert.equal(selected[0],norm('8c73b233-9576-52d7-bd5a-a78756a08c14'));
 const first=model.records.find(r=>norm(r.id)===selected[0]);
 assert.equal(first.fields.question,"What's an auto and home insurance bundle?");
 assert.match(first.fields.answer,/same company/);
 assert.match(first.fields.answer,/auto and renters/,'Keep the full visible second paragraph.');
 assert.equal(record(SITE+'/Home/bundling/Data/Hero').fields.secondaryLink,'');
 assert.equal(model.renderingIds.PublicResourceContent,'4585a48f-e841-50ca-b2a3-0d3fc9893875');
 assert.equal(model.variantIds['PublicResourceContent.Default'],'3e82160b-336f-5744-a667-7a1b94bc7307');
 const rendering=record('/sitecore/layout/Renderings/Project/LibertyMutualPublic/PublicResourceContent');
 assert.equal(rendering.fields['Datasource Template'],'');assert.equal(rendering.fields['Datasource Location'],'');
 assert.equal(rendering.fields.__Icon,'Office/32x32/document_text.png');
 assert.equal(norm(rendering.fields['Rendering Contents Resolver']),'6cccbcde5e9544e4ae66cfe7d3a0589e');
 assert.equal(rendering.fields['Can select Page as datasource'],'1');assert.equal(norm(rendering.fields.AllowedOnTemplates),norm(resourceId));
});

test('publishing a selected FAQ updates its containing page without publishing unrelated siblings',()=>{
 const faq=record('/sitecore/layout/Renderings/Project/LibertyMutualPublic/PublicFaq');
 assert.deepEqual(faq.fields['Content Dependencies'].split('|').map(norm),[
  norm('07bb8abe-7a1d-4af2-b7d6-bf5140aaaf21'),
  norm('5e13ee6f-522f-41ca-8929-aee8ee103862'),
 ]);
 const extensions=JSON.parse(fs.readFileSync(path.join(__dirname,'../items/liberty-mutual-public/public-model-extensions.json')));
 const definition=extensions.newDefinitions.find(r=>r.ID===faq.id);
 const dependencies=definition.SharedFields.find(f=>f.Hint==='Content Dependencies');
 assert.equal(dependencies.ID,'b4bbc0be-7619-4678-b2f7-947d84aa77a9');
 assert.equal(dependencies.Value,faq.fields['Content Dependencies']);
});

test('ResourcePage inherits shared classification fields once and enables search only for its own family',()=>{
 const root='/sitecore/templates/Project/LibertyMutualPublic';
 const template=record(root+'/PublicResourcePage');
 assert(template.fields['__Base template'].includes(model.templateIds.PublicPage.toUpperCase()));
 assert(template.fields['__Base template'].includes(model.templateIds.ResourceFields.toUpperCase()));
 const fields=model.records.filter(r=>r.parent==='77fb7241-8927-409f-8950-61f26865aec0');
 assert.equal(fields.length,9);assert(fields.every(r=>!['canonicalUrl','sourceLink','state','product','audience'].includes(r.path.split('/').at(-1))));
 assert(!record(root+'/Base/Resource fields/__Standard Values'));
 assert.equal(record(root+'/PublicResourcePage/__Standard Values').fields.includeInSearch,'1');
 assert.notEqual(record(root+'/PublicPage/__Standard Values').fields.includeInSearch,'1');
 assert.equal(model.fieldIds['ResourceFields.question'],'de4a7a26-6fe3-571d-9b4c-6e117690f9b5');
 assert.equal(model.fieldIds['ResourceFields.explanation'],'db533ede-0a22-5a9b-ae03-f3298cfc2e70');
});


test('Resource page starter has only native page content and independent local Hero, scoped to the resource collection',()=>{
 const branch=SITE+'/Presentation/Page Branches/Resource page',proto=branch+'/$name';
 const records=model.records.filter(r=>r.path===branch||r.path.startsWith(branch+'/'));
 assert.equal(records.length,4);
 assert.equal(record(branch).id,'3216026f-858d-46ed-aa05-edbd025c9250');
 assert.equal(record(proto).id,'83c4ff3b-22c8-42c3-accd-7ded4f6c4e66');
 assert.equal(record(proto+'/Data').id,'9b675e40-b0ca-4529-9a80-afea5d811de9');
 assert.equal(record(proto+'/Data/Hero').id,'e38057ab-517d-4902-a56d-738cc28dc09c');
 assert.equal(record(proto).template,model.templateIds.PublicResourcePage);
 assert.equal(record(proto).fields.includeInSearch,'0');
 assert.equal(norm(record(proto).fields['__Workflow state']),norm(model.workflow.draft));
 for(const key of ['question','answer','formalWording','explanation','state','product','audience'])assert(!record(proto).fields[key],key+' remains naturally blank');
 assert(!record(proto+'/Data/Introduction'));
 const layout=record(proto).fields.__Renderings;
 assert.equal((layout.match(/<r uid=/g)||[]).length,2);
 assert(layout.includes('ds="page:/Data/Hero"'));
 assert(layout.includes('uid="{3DE5BEFB-5A55-477E-B479-5A493678C3CB}"'));
 const content=layout.match(/<r uid="\{C2B69079-9986-4816-9E5F-88048DDBDC4B\}"[^>]*>/)?.[0];
 assert(content&&content.includes('ds=""'),'Built-in Context Item Resolver reads the new page; prototype GUIDs are not clone references.');
 assert(!layout.includes(record(proto).id.toUpperCase()));
 assert(!layout.includes(model.renderingIds.PublicArticle.toUpperCase()));
 assert(!layout.includes(model.renderingIds.SharedDisclosure.toUpperCase()));
 const rule=record(SITE+'/Presentation/Page Branches').fields.Rule;
 assert(rule.includes('uid="{AC72F345-4D0E-55DC-9EA4-CAAB14A5CD91}"'));
 assert(rule.includes('PageBranchId="{D5784517-B225-55AA-BC9C-8910FA0DB4F2}"'));
 const scoped=rule.match(/<rule uid="\{899B9FEF-EF0F-4E5B-99CC-8925EE563DB5\}"[\s\S]*?<\/rule>/)?.[0];
 assert(scoped&&scoped.includes('value="{AFAD2C4C-2DC6-5428-B357-28FCA18B611D}"'));
 assert(scoped.includes('PageBranchId="{3216026F-858D-46ED-AA05-EDBD025C9250}"'));
 const parent=record(SITE+'/Home/insurance-resources');
 assert.equal(parent.fields.__Masters,'{1C82E550-EBCD-4E5D-8ABD-D50D0809541E}|{3216026F-858D-46ED-AA05-EDBD025C9250}');
 for(const r of model.records.filter(r=>r.path.startsWith(SITE+'/Home')&&r.fields.__Masters?.includes('3216026F')))assert.equal(r.path,parent.path);
});
