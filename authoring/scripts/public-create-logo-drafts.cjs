#!/usr/bin/env node
'use strict';
/** Creates two reviewed-content Draft versions, changing only versioned logos.
 * Existing approved versions/history and the real Home Hero MML field remain.
 * ENV MEDIA_GUID --snapshot /absolute/before.json
 * ENV MEDIA_GUID --baseline /absolute/before.json [--apply --journal /absolute/after.json]
 * Never approves, publishes, changes shared fields, or retries uncertain writes.
 */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {ROOT,connection,read,writePrivate}=require('./campaign-native-client.cjs');
const {readItem,semantic}=require('./configure-resource-page-authoring.cjs');
const {norm,digest}=require('./public-native-state.cjs');
const SITE='/sitecore/content/LibertyMutual/liberty-mutual-public-site';
const value=(v,name)=>v.fields.find(f=>f.name===name)?.value??'';
const key=v=>v.language+':'+v.version;
function latestEnglish(item){const versions=item.versions.filter(v=>v.language==='en');assert(versions.length,'English source is missing.');return versions.sort((a,b)=>b.version-a.version)[0];}
function preserveOld(before,after){const keys=new Set(before.versions.map(key));const old={...after,versions:after.versions.filter(v=>keys.has(key(v)))};assert.deepEqual(semantic(old),semantic(before),'An existing version, shared field, or identity changed.');}
function assertNewBusinessCopy(source,created,changes){
 const volatile=new Set(['__Created','__Created by','__Updated','__Updated by','__Revision','__Shared revision','__Unversioned revision','__Owner']);
 const fields=v=>v.fields.filter(f=>!volatile.has(f.name)).map(f=>[norm(f.fieldId),f.name,f.value]).sort((a,b)=>a[0].localeCompare(b[0]));
 const expected=structuredClone(source);for(const[name,value]of Object.entries(changes)){const f=expected.fields.find(f=>f.name===name);assert(f,'Change field is missing.');f.value=value;}
 // Native AddVersion initializes publication-valid-from to the new version's
 // exact Created timestamp when the previous version left it blank. This one
 // verified system behavior is allowed explicitly; other date changes are not.
 if((value(source,'__Valid from')===''||value(source,'__Valid from')===value(source,'__Created'))&&value(created,'__Valid from')===value(created,'__Created')&&/^\d{8}T\d{6}Z$/.test(value(created,'__Valid from'))){
   expected.fields.find(f=>f.name==='__Valid from').value=value(created,'__Valid from');
 }
 assert.deepEqual(fields(created),fields(expected),'New Draft differs from its source beyond the declared fields.');
}
async function resumeDrafts(api,model,journalFile,apply){
 const log=JSON.parse(fs.readFileSync(journalFile,'utf8'));
 assert(log.origin===api.origin&&log.contractDigest===digest(model)&&Array.isArray(log.events),'Journal environment/source changed.');
 const paths=Object.keys(log.states);assert(paths.length===2&&paths.every(p=>p===SITE+'/Presentation/Partial Designs/Header/Data/Header'||p===SITE+'/Presentation/Partial Designs/Footer/Data/Footer'),'Unexpected journal target scope.');
 const states={};for(const p of paths)states[p]=await readItem(api.query,log.states[p].itemId);
 assert.deepEqual(semantic(await readItem(api.query,log.hero.itemId)),semantic(log.hero),'Protected Home Hero changed.');
 const actions=[];
 for(const p of paths){
   const before=log.states[p],current=states[p],source=latestEnglish(before);preserveOld(before,current);
   const createdEvents=log.events.filter(e=>e.action==='version-created'&&norm(e.itemId)===norm(before.itemId));assert(createdEvents.length<=1,'Ambiguous version-creation history.');
   if(!createdEvents.length){assert.deepEqual(semantic(current),semantic(before),'Unrecorded content/version change; inspect manually.');actions.push({path:p,action:'create-footer-draft-from-recorded-approved-source'});continue;}
   const version=createdEvents[0].version,newVersion=current.versions.find(v=>v.language==='en'&&v.version===version);assert(newVersion&&current.versions.length===before.versions.length+1,'Recorded new version no longer matches current history.');
   assert(value(newVersion,'logo')===log.logo&&norm(value(newVersion,'__Workflow state'))===norm(model.workflow.draft),'Recorded Header Draft has not reached the exact planned logo/Draft state; inspect before continuing.');
   assertNewBusinessCopy(source,newVersion,{logo:log.logo,'__Workflow state':'{'+model.workflow.draft.toUpperCase()+'}'});
   actions.push({path:p,version,action:'verify-existing-header-draft-no-rewrite'});
 }
 console.log(JSON.stringify({mode:apply?'resume-apply':'resume-read-only',actions},null,2));if(!apply)return;
 const record=event=>{log.events.push({at:new Date().toISOString(),...event});writePrivate(journalFile,log);};
 const after={};for(const action of actions){const before=log.states[action.path],fresh=await readItem(api.query,before.itemId);assert.deepEqual(semantic(fresh),semantic(states[action.path]),'Resume target changed immediately before action.');if(action.action.startsWith('verify-existing')){record({action:'draft-verified-existing',itemId:before.itemId,path:action.path,version:action.version});after[action.path]=fresh;}else after[action.path]=await makeDraft(api,before,{logo:log.logo},model.workflow,record);}
 assert.deepEqual(semantic(await readItem(api.query,log.hero.itemId)),semantic(log.hero),'Protected Home Hero changed.');log.after=after;log.completedAt=new Date().toISOString();writePrivate(journalFile,log);console.log('Verified existing Header v2 without rewriting it and created only the missing Footer Draft. Prior approved versions and Home MML remain unchanged.');
}
async function makeDraft(api,before,changes,workflow,record){
 const source=latestEnglish(before);assert(norm(value(source,'__Workflow'))===norm(workflow.id)&&norm(value(source,'__Workflow state'))===norm(workflow.approved),'Latest source must be approved in Public Review.');
 assert(!value(source,'__Lock').trim()||/^<r\s*\/\s*>$/.test(value(source,'__Lock').trim()),'Target is locked.');
 const fresh=await readItem(api.query,before.itemId);assert.deepEqual(semantic(fresh),semantic(before),'Target changed immediately before version creation.');
 record({action:'adding-version',itemId:before.itemId,path:before.path,sourceVersion:source.version});
 const added=await api.query('mutation($input:AddItemVersionInput!){addItemVersion(input:$input){item{itemId path version language{name}}}}',{input:{database:'master',language:'en',itemId:before.itemId,version:source.version}});
 const created=added.addItemVersion.item;assert(created.path===before.path&&created.version>source.version&&created.language.name==='en','New version identity was not confirmed.');
 record({action:'version-created',itemId:before.itemId,path:before.path,version:created.version});
 const afterAdd=await readItem(api.query,before.itemId);preserveOld(before,afterAdd);
 assert(afterAdd.versions.length===before.versions.length+1,'Unexpected version count after creation.');
 const fields={...changes,'__Workflow state':'{'+workflow.draft.toUpperCase()+'}'};
 await api.query('mutation($input:UpdateItemInput!){updateItem(input:$input){item{itemId path version}}}',{input:{database:'master',language:'en',itemId:before.itemId,version:created.version,fields:Object.entries(fields).map(([name,value])=>({name,value}))}});
 const after=await readItem(api.query,before.itemId);preserveOld(before,after);
 const newVersion=after.versions.find(v=>v.language==='en'&&v.version===created.version);assert(newVersion,'New Draft disappeared.');assertNewBusinessCopy(source,newVersion,fields);
 record({action:'draft-verified',itemId:before.itemId,path:before.path,version:created.version});return after;
}
async function main(){
 const [environment,mediaId,mode,file,...args]=process.argv.slice(2),apply=args.includes('--apply'),journal=args[2];
 assert(environment&&/^[a-f\d{}-]{32,38}$/i.test(mediaId||'')&&['--snapshot','--baseline','--resume'].includes(mode)&&path.isAbsolute(file||'')&&(!args.length||(mode==='--resume'&&args.length===1&&args[0]==='--apply')||(args.length===3&&args[0]==='--apply'&&args[1]==='--journal'&&path.isAbsolute(journal||''))),'Usage: public-create-logo-drafts.cjs ENV MEDIA_GUID --snapshot|--baseline /absolute/private.json [--apply --journal /absolute/after.json] OR --resume /absolute/partial-journal.json [--apply]');
 assert(!(mode==='--snapshot'&&args.length),'Snapshot cannot apply.');if(apply&&mode!=='--resume')assert(!fs.existsSync(journal),'Refusing to overwrite a journal.');
 const api=connection(environment,apply),model=JSON.parse(fs.readFileSync(path.join(ROOT,'authoring/items/liberty-mutual-public/public-contract.json'),'utf8'));
 if(mode==='--resume'){const existing=JSON.parse(fs.readFileSync(file,'utf8'));assert(norm(existing.mediaId)===norm(mediaId),'Resume media changed.');return resumeDrafts(api,model,file,apply);}
 const media=await read(api.query,{itemId:mediaId});assert(media?.path.startsWith('/sitecore/media library/Project/LibertyMutual/liberty-mutual-public-site/'),'Use an actual native media item in the public site.');
 const formatted=norm(mediaId).replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/,'$1-$2-$3-$4-$5').toUpperCase();
 const logo='<image mediaid="{'+formatted+'}" alt="Liberty Mutual Insurance" />';
 const targets=['Header','Footer'].map(name=>model.records.find(r=>r.path===SITE+'/Presentation/Partial Designs/'+name+'/Data/'+name));
 const states={};for(const r of targets){assert(r,'Source identity missing.');states[r.path]=await readItem(api.query,r.id);const version=latestEnglish(states[r.path]);assert(norm(value(version,'__Workflow state'))===norm(model.workflow.approved),'Latest logo datasource is not approved.');const f=await api.query('query($where:ItemQueryInput!){item(where:$where){field(name:"logo"){templateField{versioning}}}}',{where:{database:'master',language:'en',itemId:r.id}});assert(f.item.field.templateField.versioning==='VERSIONED','Logo field must be versioned to preserve approved history.');}
 const hero=await readItem(api.query,model.records.find(r=>r.path===SITE+'/Home/Data/Hero').id);
 const snapshot={origin:api.origin,contractDigest:digest(model),mediaId:media.itemId,logo,states,hero,capturedAt:new Date().toISOString()};
 if(mode==='--snapshot'){assert(!fs.existsSync(file),'Refusing to overwrite a before-image.');writePrivate(file,snapshot);console.log('Captured approved Header/Footer versions and protected Home MML image. No native writes.');return;}
 const before=JSON.parse(fs.readFileSync(file,'utf8'));assert(before.origin===api.origin&&before.contractDigest===digest(model)&&norm(before.mediaId)===norm(mediaId),'Environment, source, or media changed.');
 for(const r of targets)assert.deepEqual(semantic(states[r.path]),semantic(before.states[r.path]),'Logo datasource changed; preserve and recapture.');assert.deepEqual(semantic(hero),semantic(before.hero),'Home Hero changed; preserve and recapture.');
 console.log(JSON.stringify({mode:apply?'apply':'read-only',targets:targets.map(r=>({id:r.id,path:r.path,sourceVersion:latestEnglish(states[r.path]).version,change:'logo only in new Draft version'}))},null,2));if(!apply)return;
 const log={...snapshot,events:[]};const record=event=>{log.events.push({at:new Date().toISOString(),...event});writePrivate(journal,log);};
 const after={};for(const r of targets)after[r.path]=await makeDraft(api,states[r.path],{logo},model.workflow,record);
 assert.deepEqual(semantic(await readItem(api.query,hero.itemId)),semantic(before.hero),'Protected Home Hero changed.');log.after=after;log.completedAt=new Date().toISOString();writePrivate(journal,log);
 console.log('Verified new Header/Footer Drafts, unchanged previous approved versions, and unchanged Home MML image. Use native Submit/Approve, then publish content plus the actual media dependency.');
}
module.exports={makeDraft,latestEnglish,preserveOld,assertNewBusinessCopy,resumeDrafts};if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
