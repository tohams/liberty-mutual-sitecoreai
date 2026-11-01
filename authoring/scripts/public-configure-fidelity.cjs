#!/usr/bin/env node
'use strict';
/** Guarded six-target new-Draft composition update. Default is read-only.
 * ENV --snapshot /absolute/before.json
 * ENV --baseline /absolute/before.json [--apply --journal /absolute/after.json]
 * New definitions/CreateOnly content must exist first. No approval/publication.
 */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {ROOT,connection,read,writePrivate}=require('./campaign-native-client.cjs');
const {readItem,semantic}=require('./configure-resource-page-authoring.cjs');
const {makeDraft,latestEnglish,preserveOld,assertNewBusinessCopy}=require('./public-create-logo-drafts.cjs');
const {finalPatch}=require('./public-final-layout.cjs');
const {norm,digest}=require('./public-native-state.cjs');
const value=(item,name)=>item.fields.find(f=>f.name===name)?.value??'';
const {xmlShape}=require('./configure-product-spotlight.cjs');
function sameField(expected,actual){
 if(expected===actual)return true;
 const a=expected.match(/^\s*<(image|link)\b/i),b=actual.match(/^\s*<(image|link)\b/i);
 if(!a||!b||a[1].toLowerCase()!==b[1].toLowerCase())return false;
 const x=xmlShape(expected,a[1]),y=xmlShape(actual,b[1]);x[0]=x[0].toLowerCase();y[0]=y[0].toLowerCase();return JSON.stringify(x)===JSON.stringify(y);
}
const device='fe5d7fdf-89c0-4d99-9aa3-b5fbd009c9f3';
function source(){
 const base=path.join(ROOT,'authoring/items/liberty-mutual-public');
 const plan=JSON.parse(fs.readFileSync(path.join(base,'public-fidelity-draft-plan.json'),'utf8'));
 const model=JSON.parse(fs.readFileSync(path.join(base,'public-contract.json'),'utf8'));
 assert(plan.sitePath===model.sitePath&&plan.mediaBindings.every(x=>x.bound),'Require fully bound reviewed native source.');
 assert(plan.newDraftChanges.length===4&&plan.pages.length===3,'Unexpected fidelity scope.');
 return {plan,model};
}
async function capture(api,plan,model){
 const targets=[...plan.newDraftChanges.map(c=>({...c,kind:'datasource'})),...plan.pages.filter(p=>p.expectedSharedLayout).map(p=>({id:p.id,path:p.path,kind:'page',page:p}))];
 assert(targets.length===6&&new Set(targets.map(t=>norm(t.id))).size===6,'The migration must target exactly two existing pages and four datasources.');
 const states={},changes=[];
 for(const t of targets){
  const item=await readItem(api.query,t.id);assert(item?.path===t.path,'Expected native fidelity target missing.');
  const current=latestEnglish(item);
  assert(norm(value(current,'__Workflow'))===norm(model.workflow.id)&&norm(value(current,'__Workflow state'))===norm(model.workflow.approved),'Latest target must be approved in Public Review before creating its next Draft.');
  let fields=t.fields;
  if(t.kind==='page')fields={'__Final Renderings':finalPatch({shared:value(current,'__Renderings'),expectedShared:t.page.expectedSharedLayout,currentFinal:value(current,'__Final Renderings'),plan:t.page,device}).xml};
  for(const name of Object.keys(fields)){
   const q=await api.query('query($where:ItemQueryInput!,$name:String!){item(where:$where){field(name:$name){templateField{versioning}}}}',{where:{database:'master',itemId:t.id,language:'en',version:current.version},name});
   assert(q.item?.field?.templateField?.versioning==='VERSIONED','Fidelity changes require a versioned native field: '+name);
  }
  states[t.path]=item;changes.push({id:t.id,path:t.path,kind:t.kind,sourceVersion:current.version,fields});
 }
 return {states,changes};
}
async function prerequisites(api,plan){
 // Check real native selections/dependencies before publishing a composition
 // that references them. Draft/Approved state does not substitute for this.
 let count=0;for(const r of plan.createOnlyEditorialRecords){
  const actual=await read(api.query,{itemId:r.ID});assert(actual?.path===r.Path&&norm(actual.template.templateId)===norm(r.Template),'CreateOnly fidelity dependency missing: '+r.Path);
  for(const f of r.Languages[0].Versions[0].Fields){if(f.Hint.startsWith('__'))continue;assert(sameField(String(f.Value),value(actual,f.Hint)),'Native dependency differs from prepared content: '+r.Path+'/'+f.Hint);}
  count++;
 }
 return count;
}
function resumeActions(log,current,workflow){
 const result=[];
 for(const change of log.changes){
  const before=log.states[change.path],now=current[change.path];assert(before&&now?.path===change.path,'Resume target identity changed.');
  preserveOld(before,now);
  const events=log.events.filter(e=>e.action==='version-created'&&norm(e.itemId)===norm(change.id));
  assert(events.length<=1,'More than one created version is recorded; inspect manually.');
  if(!events.length){
   assert(!log.events.some(e=>e.action==='adding-version'&&norm(e.itemId)===norm(change.id)),'An unconfirmed AddVersion intent must be read back manually before retrying.');
   assert.deepEqual(semantic(now),semantic(before),'An unrecorded target/version change occurred.');
   result.push({...change,action:'create-only-unstarted-draft'});continue;
  }
  const version=events[0].version,created=now.versions.find(v=>v.language==='en'&&v.version===version);
  assert(created&&now.versions.length===before.versions.length+1&&latestEnglish(now).version===version,'Recorded Draft version inventory changed.');
  assertNewBusinessCopy(latestEnglish(before),created,{...change.fields,'__Workflow state':'{'+workflow.draft.toUpperCase()+'}'});
  result.push({...change,action:'verify-existing-draft-without-rewrite',version});
 }
 return result;
}
async function resume(api,plan,model,file,apply){
 const log=JSON.parse(fs.readFileSync(file,'utf8'));
 assert(log.origin===api.origin&&log.sourceDigest===digest(plan)&&log.changes?.length===6&&log.events,'Resume environment/source or journal scope changed.');
 const current={};for(const change of log.changes)current[change.path]=await readItem(api.query,change.id);
 const actions=resumeActions(log,current,model.workflow);
 console.log(JSON.stringify({mode:apply?'resume-apply':'resume-read-only',actions:actions.map(c=>({path:c.path,action:c.action,version:c.version}))},null,2));if(!apply)return;
 const record=e=>{log.events.push({at:new Date().toISOString(),...e});writePrivate(file,log);};const after={};
 for(const action of actions){
  const fresh=await readItem(api.query,action.id);assert.deepEqual(semantic(fresh),semantic(current[action.path]),'Resume target changed immediately before action.');
  if(action.action==='verify-existing-draft-without-rewrite'){after[action.path]=fresh;record({action:'draft-verified-existing',itemId:action.id,path:action.path,version:action.version});}
  else after[action.path]=await makeDraft(api,log.states[action.path],action.fields,model.workflow,record);
 }
 const verified=resumeActions(log,after,model.workflow);assert(verified.every(c=>c.action==='verify-existing-draft-without-rewrite'),'Not all six recorded Drafts were verified.');
 for(const change of log.changes.filter(c=>c.kind==='page'))assert.equal(value(latestEnglish(after[change.path]),'__Renderings'),value(latestEnglish(log.states[change.path]),'__Renderings'),'Shared page layout changed.');
 const hero=model.sitePath+'/Home/Data/Hero';assert.equal(value(latestEnglish(after[hero]),'image'),value(latestEnglish(log.states[hero]),'image'),'Home MML changed.');
 log.after=after;log.completedAt=new Date().toISOString();writePrivate(file,log);console.log('Verified all six Drafts and prior versions; resumed only unstarted targets, without duplicating any created version.');
}
async function main(){
 const [environment,mode,file,...args]=process.argv.slice(2),apply=args.includes('--apply'),journal=args[2];
 assert(environment&&['--snapshot','--baseline','--resume'].includes(mode)&&path.isAbsolute(file||'')&&(!args.length||(mode==='--resume'&&args.length===1&&args[0]==='--apply')||(args.length===3&&args[0]==='--apply'&&args[1]==='--journal'&&path.isAbsolute(journal||''))),'Usage: public-configure-fidelity.cjs ENV --snapshot|--baseline /absolute/private.json [--apply --journal /absolute/after.json], or ENV --resume /absolute/journal.json [--apply]');
 assert(!(mode==='--snapshot'&&args.length),'Snapshot cannot apply.');if(apply)assert(!fs.existsSync(journal),'Refusing to overwrite an existing journal.');
 const api=connection(environment,apply),{plan,model}=source();if(mode==='--resume')return resume(api,plan,model,file,apply);const dependencyCount=await prerequisites(api,plan);const {states,changes}=await capture(api,plan,model);
 const snapshot={origin:api.origin,sourceDigest:digest(plan),capturedAt:new Date().toISOString(),dependencyCount,states,changes};
 if(mode==='--snapshot'){assert(!fs.existsSync(file),'Refusing to overwrite a before-image.');writePrivate(file,snapshot);console.log('Captured six approved fidelity targets and verified native selected-content dependencies. No native writes.');return;}
 const before=JSON.parse(fs.readFileSync(file,'utf8'));assert(before.origin===api.origin&&before.sourceDigest===digest(plan),'Environment or reviewed source changed.');
 for(const [p,item]of Object.entries(states))assert.deepEqual(semantic(item),semantic(before.states[p]),'A fidelity target changed after its before-image; preserve and recapture.');
 console.log(JSON.stringify({mode:apply?'apply':'read-only',dependencies:dependencyCount,changes:changes.map(c=>({path:c.path,sourceVersion:c.sourceVersion,fields:Object.keys(c.fields)})),preserved:'All preceding versions/history, shared page layouts, source media IDs, canonical Promotion/Disclosure instances, and unrelated data.'},null,2));if(!apply)return;
 const log={...snapshot,events:[]};const record=e=>{log.events.push({at:new Date().toISOString(),...e});writePrivate(journal,log);};const after={};
 for(const change of changes)after[change.path]=await makeDraft(api,states[change.path],change.fields,model.workflow,record);
 for(const page of changes.filter(c=>c.kind==='page'))assert.equal(value(latestEnglish(after[page.path]),'__Renderings'),value(latestEnglish(states[page.path]),'__Renderings'),'Shared layout changed.');
 const hero=changes.find(c=>c.path===model.sitePath+'/Home/Data/Hero');assert.equal(value(latestEnglish(after[hero.path]),'image'),value(latestEnglish(states[hero.path]),'image'),'Home MML image changed.');
 log.after=after;log.completedAt=new Date().toISOString();writePrivate(journal,log);
 console.log('Verified six new Draft versions, unchanged prior versions, unchanged shared page layouts, and the preserved Home MML image. Use native Submit/Approve and publication next.');
}
module.exports={capture,prerequisites,sameField,resumeActions,resume};if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
