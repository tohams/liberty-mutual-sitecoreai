#!/usr/bin/env node
'use strict';
/** Explicit delivered-item native review; no raw state writes or publication.
 * ENV --snapshot /abs/before.json [--report /abs/plan.json]
 * ENV --baseline /abs/before.json --report /abs/result.json [--apply --journal /abs/journal.json]
 * ENV --resume /abs/journal.json --report /abs/result.json [--apply]
 * Four read-only snapshot workers; native commands are sequential and journaled.
 */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {ROOT,connection,read,value,writePrivate}=require('./campaign-native-client.cjs');
const {semantic,digest,norm}=require('./public-native-state.cjs');
const W=require('./public-configure-editorial-workflow.cjs');
const N=require('./public-approve-initial-seed.cjs');
const L=require('./public-approve-logo-revision.cjs');
const {sameField}=require('./public-configure-fidelity.cjs');
const {finalPatch}=require('./public-final-layout.cjs');
const {xmlShape}=require('./configure-product-spotlight.cjs');
const BASE=path.join(ROOT,'authoring/items/liberty-mutual-public');
const PUBLIC='/sitecore/content/LibertyMutual/liberty-mutual-public-site';
const PUBLIC_PAGE='a4de2222-c8a5-54d4-adee-bbad976a457c';
function generatedThumbnailId(xml){
 const shape=xmlShape(xml,'image'),attrs=Object.fromEntries(shape[1]);
 assert(shape[3].length===0&&shape[2]===''&&Object.keys(attrs).length===1&&/^\{[a-f\d-]{36}\}$/i.test(attrs.mediaid||''),'Only the native mediaid-only thumbnail field is accepted.');return norm(attrs.mediaid);
}
function verifyThumbnailMedia(row,xml,media,now=new Date()){
 assert(norm(row.target.template)===norm(PUBLIC_PAGE)&&row.target.path.startsWith(PUBLIC+'/Home')&&!value(row.item,'__Thumbnail').trim(),'Only previously blank public-page thumbnails may be acknowledged.');
 const id=norm(row.target.id),imageId=generatedThumbnailId(xml);
 const expected='/sitecore/media library/Project/LibertyMutual/liberty-mutual-public-site/System/'+id.slice(0,4).toUpperCase().split('').join('/')+'/thumbnail_'+id.toUpperCase();
 assert(norm(media?.itemId)===imageId&&media.path===expected&&norm(media.template.templateId)==='f1828a2c7e5d4bbd98ca320474871548','Thumbnail is not the exact native per-page generated media item.');
 const system=s=>s.replace(/\\+/g,'\\')==='sitecore\\ThumbnailsGenerator';
 assert(system(value(media,'__Owner'))&&system(value(media,'__Created by')),'Thumbnail media does not belong to the verified native generator.');
 const created=value(media,'__Created'),pageCreated=value(row.item,'__Created');
 assert(/^\d{8}T\d{6}Z$/.test(created)&&(!pageCreated||created>=pageCreated)&&created<=now.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z'),'Unexpected generated media creation time.');
 return {itemId:row.target.id,field:xml,mediaId:media.itemId,mediaPath:media.path,mediaTemplate:media.template.templateId,mediaCreated:created,verifiedAt:now.toISOString()};
}
function acknowledgeThumbnail(before,after,evidence){
 const old=value(before,'__Thumbnail'),current=value(after,'__Thumbnail');if(old===current)return after;
 assert(old.trim()===''&&evidence&&norm(evidence.itemId)===norm(before.itemId)&&current===evidence.field,'An authored or unverified thumbnail change must be preserved and reviewed.');
 const copy=structuredClone(after),field=copy.fields.find(f=>f.name==='__Thumbnail');assert(field,'Thumbnail metadata missing.');field.value=old;return copy;
}
async function thumbnailPreflight(query,before,journal,save){
 journal.generatedThumbnails??={};const candidates=before.rows.filter(r=>norm(r.target.template)===norm(PUBLIC_PAGE)&&!value(r.item,'__Thumbnail').trim());
 let cursor=0;async function worker(){while(cursor<candidates.length){const row=candidates[cursor++];const {item}=await query('query($where:ItemQueryInput!){item(where:$where){field(name:"__Thumbnail"){value}}}',{where:{database:'master',itemId:row.target.id,language:'en',version:row.target.version}});const xml=item?.field?.value||'';if(!xml)continue;const key=norm(row.target.id),old=journal.generatedThumbnails[key];if(old){assert(old.field===xml,'A generated thumbnail was replaced after verification.');continue;}const media=await read(query,{itemId:generatedThumbnailId(xml)});journal.generatedThumbnails[key]=verifyThumbnailMedia(row,xml,media);}}
 await Promise.all([worker(),worker(),worker(),worker()]);save({phase:'native-generated-thumbnail-preflight',verified:Object.keys(journal.generatedThumbnails).length});
}
async function observeThumbnail(query,row,before,after,journal,save){
 if(value(before,'__Thumbnail')===value(after,'__Thumbnail'))return;
 const key=norm(row.target.id),xml=value(after,'__Thumbnail');
 if(journal.generatedThumbnails[key])return;
 const media=await read(query,{itemId:generatedThumbnailId(xml)});
 journal.generatedThumbnails[key]=verifyThumbnailMedia(row,xml,media);
 save({phase:'native-generated-thumbnail-observed',itemId:row.target.id,evidence:journal.generatedThumbnails[key]});
}
function manifest(){
 const load=name=>JSON.parse(fs.readFileSync(path.join(BASE,name),'utf8'));
 const editorial=load('public-editorial-records.json'),model=load('public-contract.json'),fidelity=load('public-fidelity-draft-plan.json'),portal=load('portal-relevance-contract.json');
 const types=new Set(Object.entries(model.templateIds).filter(([name])=>name!=='PublicRenderingParameters').map(([,id])=>norm(id)));
 const rows=[...editorial.records,...portal.records].filter(r=>types.has(norm(r.Template)));
 const six=new Map(fidelity.newDraftChanges.map(c=>[norm(c.id),c]));
 for(const p of fidelity.pages.filter(p=>p.expectedSharedLayout))six.set(norm(p.id),{...p,fields:{__Renderings:p.expectedSharedLayout,'__Final Renderings':finalPatch({shared:p.expectedSharedLayout,expectedShared:p.expectedSharedLayout,currentFinal:'',plan:p,device:'fe5d7fdf-89c0-4d99-9aa3-b5fbd009c9f3'}).xml}});
 const targets=rows.map(r=>{
  assert(r.Path.startsWith(model.sitePath+'/')||r.Path.startsWith(portal.libraryPath+'/'),'Target outside the exact public/agency-priority source scope.');
  assert(!/\/Presentation\/Page Branches\//.test(r.Path)&&!r.Path.includes('$name')&&!/\/(?:practice|Authoring check)(?:\/|$)/i.test(r.Path),'Branch/practice/QA approvals are forbidden.');
  const delta=six.get(norm(r.ID));
  return {id:r.ID,path:r.Path,template:r.Template,version:delta?(/\/Partial Designs\/(?:Header|Footer)\/Data\//.test(r.Path)?3:2):1,
   expected:delta?delta.fields:Object.fromEntries([...(r.SharedFields||[]),...(r.Languages[0].Fields||[]),...r.Languages[0].Versions[0].Fields].filter(f=>!f.Hint.startsWith('__')||f.Hint==='__Renderings').map(f=>[f.Hint,String(f.Value)]))};
 });
 assert(targets.length>100&&targets.length<250&&new Set(targets.map(t=>norm(t.id))).size===targets.length,'Invalid finite delivery manifest.');
 assert(targets.filter(t=>t.path.startsWith(portal.libraryPath+'/')).length===7,'Exactly seven agency-priority editorial items are allowed; folders are excluded.');
 return {sourceHash:digest({editorial,fidelity,portal}),workflow:W.IDS.workflow,targets:targets.sort((a,b)=>a.path.localeCompare(b.path))};
}
function sameExpected(name,expected,actual){
 if(expected===actual)return true;
 if(expected.replaceAll('\r\n','\n')===actual.replaceAll('\r\n','\n'))return true;
 if(['__Renderings','__Final Renderings'].includes(name))return JSON.stringify(xmlShape(expected))===JSON.stringify(xmlShape(actual));
 return sameField(expected,actual);
}
function assertTarget(item,target){
 assert(item?.path===target.path&&norm(item.itemId)===norm(target.id)&&norm(item.template.templateId)===norm(target.template)&&item.version===target.version&&item.language.name==='en','Delivery target identity/template/version differs from the finite manifest.');
 assert(item.versions.every(v=>v.language.name==='en'&&v.version<=target.version)&&item.versions.length===target.version,'Unexpected language or version; inspect rather than approve it.');
 assert(norm(value(item,'__Workflow'))===norm(W.IDS.workflow),'Only Public Review may be approved by this helper.');
 const route=N.routeFor(value(item,'__Workflow state'));
 if(route)for(const [name,expected]of Object.entries(target.expected))assert(sameExpected(name,expected,value(item,name)),'Review source differs from native content: '+target.path+'/'+name);
}
async function actor(query){
 const {currentUser:user}=await query('query{currentUser{name isAdministrator}}');assert(user?.name&&user.isAdministrator===true,'Use the verified existing setup administrator.');return user;
}
async function details(query,item){
 const variables={where:{workflowId:W.IDS.workflow},item:{database:'master',itemId:item.itemId,language:'en',version:item.version}};
 const {workflow}=await query(L.INVENTORY,variables);
 assert(norm(workflow?.workflowId)===norm(W.IDS.workflow)&&workflow.commands.pageInfo.hasNextPage===false&&workflow.history.pageInfo.hasNextPage===false,'Incomplete native command/history inventory.');
 const edges=workflow.history.edges;let started=null,history=[];
 if(edges.length){
  const firstIsStart=norm(edges[0].node.newState?.stateId)===norm(W.IDS.draft);
  let response;
  if(firstIsStart){started=edges[0];response=await query(L.TRANSITIONS,{...variables,after:started.cursor});}
  else response=await query(N.QUERY,variables);
  assert(response.workflow.history.pageInfo.hasNextPage===false,'Incomplete native transition history.');history=response.workflow.history.nodes;
  const summaries=firstIsStart?edges.slice(1):edges;
  assert(history.length===summaries.length,'History cursor silently omitted a native event.');
  for(let n=0;n<history.length;n++){const {oldState,...summary}=history[n];assert(oldState?.stateId,'Transition old state is missing.');assert.deepEqual(summary,summaries[n].node,'History changed between native reads.');}
 }
 return {commands:workflow.commands.nodes,started,history};
}
const historyComparable=n=>({started:n.started,history:n.history});
function verifyHistory(before,after,from,to,user){
 assert.deepEqual(after.started,before.started,'Native version-start history changed.');
 assert.deepEqual(after.history.slice(0,-1),before.history,'Earlier native transition history changed.');
 assert(after.history.length===before.history.length+1,'Expected exactly one new workflow history event.');
 const e=after.history.at(-1);assert(norm(e.oldState?.stateId)===norm(from)&&norm(e.newState?.stateId)===norm(to)&&e.user===user,'Native state/actor history proof failed.');return e;
}
async function capture(query,m){
 const user=await actor(query),rows=new Array(m.targets.length);let cursor=0;
 async function worker(){while(cursor<m.targets.length){const index=cursor++,target=m.targets[index];const item=await read(query,{itemId:target.id,version:target.version});assertTarget(item,target);const prior=[];for(let v=1;v<target.version;v++)prior.push(await read(query,{itemId:target.id,version:v}));rows[index]={target,item,prior,native:await details(query,item)};}}
 await Promise.all([worker(),worker(),worker(),worker()]);return {sourceHash:m.sourceHash,actor:user,rows};
}
function plan(before){return {sourceHash:before.sourceHash,targets:before.rows.map(r=>({id:r.target.id,path:r.target.path,version:r.target.version,state:value(r.item,'__Workflow state'),commands:N.routeFor(value(r.item,'__Workflow state'))?(norm(value(r.item,'__Workflow state'))===norm(W.IDS.draft)?['Submit','Approve']:['Approve']):[]})),nativeCommandsOnly:true,publishes:false,preservesPreviousVersions:true,excludesFoldersBranchesAndQa:true};}
function patchFrom(base,current){return current.fields.filter(f=>f.value!==base.fields.find(b=>norm(b.fieldId)===norm(f.fieldId))?.value).map(f=>({fieldId:f.fieldId,value:f.value}));}
function overlay(base,patch=[]){const copy=structuredClone(base);for(const f of patch){const target=copy.fields.find(x=>norm(x.fieldId)===norm(f.fieldId));assert(target,'Progress field disappeared.');target.value=f.value;}return copy;}
function verifyPrior(before,after,evidence){assert.deepEqual(semantic(acknowledgeThumbnail(before,after,evidence)),semantic(before),'A preceding approved version changed.');}
async function preservePrior(query,row,evidence){for(const before of row.prior){const after=await read(query,{itemId:before.itemId,version:before.version});verifyPrior(before,after,evidence);}}
function verifyExpandedTransition(before,after,next,user,evidence){N.verifyTransition(before,acknowledgeThumbnail(before,after,evidence),next,user);}
async function run({query,before,journal,apply=false,persist=()=>{}}){
 assert.deepEqual(await actor(query),before.actor,'Native approval actor changed.');
 const save=event=>{if(event)journal.events.push({at:new Date().toISOString(),...event});if(apply)persist(journal);};
 await thumbnailPreflight(query,before,journal,save);
 const progress=(row,item,native)=>{journal.progress[norm(row.target.id)]={patch:patchFrom(row.item,item),native};save();};
 for(const row of before.rows){
  const key=norm(row.target.id);let current=await read(query,{itemId:row.target.id,version:row.target.version}),native=await details(query,current);
  assertTarget(current,row.target);
  await observeThumbnail(query,row,row.item,current,journal,save);
  if(journal.pending?.key===key){
   const pending=journal.pending,old=overlay(row.item,pending.beforePatch);
   if(norm(value(current,'__Workflow state'))===norm(pending.route.nextStateId)){
    verifyExpandedTransition(old,current,pending.route.nextStateId,before.actor.name,journal.generatedThumbnails[key]);verifyHistory(pending.native,native,value(old,'__Workflow state'),pending.route.nextStateId,before.actor.name);progress(row,current,native);journal.pending=null;save({phase:'pending-command-confirmed-by-native-readback',itemId:row.target.id});
   }else{
    assert.deepEqual(semantic(acknowledgeThumbnail(old,current,journal.generatedThumbnails[key])),semantic(old),'Uncertain command did not match its before or after state.');assert.deepEqual(historyComparable(native),historyComparable(pending.native),'Uncertain command history differs.');journal.pending=null;save({phase:'pending-command-confirmed-not-applied',itemId:row.target.id});
   }
  }
  const expected=journal.progress[key]?overlay(row.item,journal.progress[key].patch):row.item;
  assert.deepEqual(semantic(acknowledgeThumbnail(expected,current,journal.generatedThumbnails[key])),semantic(expected),'Content/version changed since capture or verified progress.');
  assert.deepEqual(historyComparable(native),historyComparable(journal.progress[key]?.native||row.native),'Native history changed outside this journal.');
  if(!apply)continue;
  for(let step=0;step<2;step++){
   const route=N.routeFor(value(current,'__Workflow state'));if(!route)break;
   assert(native.commands.some(c=>norm(c.commandId)===norm(route.commandId)),'Expected native Submit/Approve command unavailable.');
   const comments='Liberty Mutual reviewed delivery content: '+route.name.toLowerCase()+'.';
   journal.pending={key,route,beforePatch:patchFrom(row.item,current),native};save({phase:'native-command-intent',itemId:row.target.id,path:row.target.path,version:row.target.version,commandId:route.commandId});
   const response=await query(N.MUTATION,{input:{commandId:route.commandId,comments,item:{database:'master',itemId:row.target.id,language:'en',version:row.target.version}}});
   const executed=response.executeWorkflowCommand;save({phase:'native-command-response',itemId:row.target.id,result:executed});
   assert(executed?.successful===true&&executed.completed===true&&norm(executed.nextStateId)===norm(route.nextStateId),'Native command not confirmed; resume reconciles state/history before any retry.');
   const after=await read(query,{itemId:row.target.id,version:row.target.version}),next=await details(query,after);
   await observeThumbnail(query,row,current,after,journal,save);
   verifyExpandedTransition(current,after,route.nextStateId,before.actor.name,journal.generatedThumbnails[key]);const event=verifyHistory(native,next,value(current,'__Workflow state'),route.nextStateId,before.actor.name);
   current=after;native=next;progress(row,current,native);journal.pending=null;save({phase:'native-command-history-verified',itemId:row.target.id,version:row.target.version,event});
  }
  assert(norm(value(current,'__Workflow state'))===norm(W.IDS.approved),'Target did not reach Approved.');await preservePrior(query,row,journal.generatedThumbnails[key]);progress(row,current,native);
 }
 if(apply){journal.completedAt=new Date().toISOString();save();}
 return {sourceHash:before.sourceHash,applied:apply,targets:before.rows.length,priorVersionsPreserved:before.rows.reduce((n,r)=>n+r.prior.length,0),pending:journal.pending!==null,published:false};
}
async function main(){
 const args=process.argv.slice(2),environment=args.shift(),options={};while(args.length){const name=args.shift();assert(['--snapshot','--baseline','--resume','--report','--journal','--apply'].includes(name)&&!Object.hasOwn(options,name),'Invalid/repeated option.');options[name]=name==='--apply'?true:args.shift();}
 assert(environment&&['--snapshot','--baseline','--resume'].filter(k=>options[k]).length===1,'Choose one snapshot, baseline, or resume file.');
 for(const [key,file]of Object.entries(options))if(key!=='--apply')assert(path.isAbsolute(file||'')&&!path.resolve(file).startsWith(ROOT+path.sep),'Keep approval snapshots/journals/reports private outside source.');
 const m=manifest(),api=connection(environment,options['--apply']===true);
 if(options['--snapshot']){assert(!options['--apply']&&!options['--journal']&&!fs.existsSync(options['--snapshot']),'Use a new snapshot without apply.');const before=await capture(api.query,m);writePrivate(options['--snapshot'],{origin:api.origin,capturedAt:new Date().toISOString(),before});if(options['--report']){assert(!fs.existsSync(options['--report']));writePrivate(options['--report'],plan(before));}console.log(JSON.stringify({captured:before.rows.length,sourceHash:m.sourceHash,published:false}));return;}
 assert(options['--report']&&!fs.existsSync(options['--report']),'Use a new result/plan report.');
 let journal,baselineFile;
 if(options['--resume']){assert(!options['--journal'],'Resume uses its existing journal.');journal=JSON.parse(fs.readFileSync(options['--resume'],'utf8'));baselineFile=journal.baselineFile;}
 else{baselineFile=options['--baseline'];if(options['--apply'])assert(options['--journal']&&!fs.existsSync(options['--journal']),'Use a new explicit journal for initial apply.');}
 const baseline=JSON.parse(fs.readFileSync(baselineFile,'utf8'));assert(baseline.origin===api.origin&&baseline.before.sourceHash===m.sourceHash,'Environment or reviewed finite source changed.');
 if(!journal)journal={schemaVersion:1,origin:api.origin,sourceHash:m.sourceHash,baselineFile,baselineDigest:digest(baseline),progress:{},pending:null,events:[]};
 assert(journal.origin===api.origin&&journal.sourceHash===m.sourceHash&&journal.baselineDigest===digest(baseline),'Resume journal/baseline/source changed.');
 const journalFile=options['--resume']||options['--journal'];const result=await run({query:api.query,before:baseline.before,journal,apply:options['--apply']===true,persist:j=>writePrivate(journalFile,j)});
 writePrivate(options['--report'],options['--apply']?result:{...plan(baseline.before),verification:result});console.log(JSON.stringify(result));
}
module.exports={manifest,sameExpected,assertTarget,details,verifyHistory,patchFrom,overlay,generatedThumbnailId,verifyThumbnailMedia,acknowledgeThumbnail,thumbnailPreflight,verifyExpandedTransition,verifyPrior,preservePrior,capture,run,plan};if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
