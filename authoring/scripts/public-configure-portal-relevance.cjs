#!/usr/bin/env node
'use strict';
/** Adds only three new placements and two layout placeholder references.
 * Existing rendering bytes/UIDs and every language/version's Final Renderings
 * (including native personalization/experiments) are protected before/after.
 * Install exact PortalRelevancePresentation/Seed and PublicModel first.
 * ENV --snapshot /absolute/before.json
 * ENV --baseline /absolute/before.json [--apply --journal /absolute/after.json]
 * Does not publish, change audiences, modify practice pages, or retry writes.
 */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {ROOT,connection,read,writePrivate}=require('./campaign-native-client.cjs');
const {readItem,semantic}=require('./configure-resource-page-authoring.cjs');
const {xmlShape}=require('./configure-product-spotlight.cjs');
const {digest,norm}=require('./public-native-state.cjs');
const P='/sitecore/content/LibertyMutual/liberty-mutual-agent-portal';
const BRACE=s=>'{'+s.toUpperCase()+'}';
const val=(item,name)=>item.versions[0].fields.find(f=>f.name===name)?.value??'';
const config=()=>JSON.parse(fs.readFileSync(path.join(ROOT,'authoring/items/liberty-mutual-public/portal-relevance-contract.json'),'utf8'));
function placement(m,component,key,uid,ds,dynamic){return `<r uid="${BRACE(uid)}" id="${BRACE(m.renderings[component].id)}" ph="${key}" ds="${BRACE(ds)}" par="FieldNames=${BRACE(m.renderings[component].variantId)}&amp;DynamicPlaceholderId=${dynamic}" />`;}
function appendIds(current,ids){
 const old=current.split(/[|\r\n]+/).map(x=>x.trim()).filter(Boolean);assert(old.every(x=>/^\{[a-f\d-]{36}\}$/i.test(x)),'Layout placeholder list has an unsupported value.');
 const additions=ids.filter(id=>!old.some(x=>norm(x)===norm(id)));
 return current+(old.length&&additions.length?'|':'')+additions.map(BRACE).join('|');
}
function appendPlacements(current,insertions){
 const shape=xmlShape(current),devices=shape[3].filter(n=>n[0]==='d');
 assert(devices.length===1&&norm(Object.fromEntries(devices[0][1]).id)===norm('fe5d7fdf-89c0-4d99-9aa3-b5fbd009c9f3'),'Unexpected portal device layout.');
 const nodes=devices[0][3].filter(n=>n[0]==='r'),add=[];
 for(const xml of insertions){
   const desired=xmlShape(xml),uid=Object.fromEntries(desired[1]).uid;
   const existing=nodes.filter(n=>norm(Object.fromEntries(n[1]).uid)===norm(uid));
   assert(existing.length<2,'Duplicate owned rendering UID.');
   if(existing.length)assert.deepEqual(existing[0],desired,'An existing owned placement was changed; preserve it and review.');else add.push(xml);
 }
 if(!add.length)return current;
 assert((current.match(/<\/d>/g)||[]).length===1,'Unsupported portal device closing tags.');
 return current.replace('</d>',add.join('')+'</d>');
}
function targets(m){
 const global=m.placeholderIds;
 return [
  {id:'3d40b9c9-8126-5ff8-81e1-a48afb1ba1a8',path:'/sitecore/layout/Layouts/Project/LibertyMutual/PortalLayout',field:'Placeholders',after:v=>appendIds(v,[global['headless-agency-priorities'].global,global['headless-shared-disclosure'].global])},
  {id:'2dac85b2-7271-519e-a454-5a841ac1ad0d',path:'/sitecore/layout/Layouts/Project/LibertyMutual/ResourcesLayout',field:'Placeholders',after:v=>appendIds(v,[global['headless-shared-disclosure'].global])},
  {id:'ae9e45ca-f127-4abe-9ca7-2ff109981998',path:P+'/Home',field:'__Renderings',after:v=>appendPlacements(v,[placement(m,'AgencyPriorities','headless-agency-priorities',m.instances.homePriorities,m.datasources.neutral.id,80),placement(m,'SharedDisclosure','headless-shared-disclosure',m.instances.homeDisclosure,m.sharedDisclosureId,81)])},
  {id:'c9b4e46b-3b72-50d4-a96e-732c4d181b6a',path:P+'/Home/resources',field:'__Renderings',after:v=>appendPlacements(v,[placement(m,'SharedDisclosure','headless-shared-disclosure',m.instances.resourcesDisclosure,m.sharedDisclosureId,80)])},
 ];
}
async function prerequisites(api,m){
 for(const name of ['neutral','principal','producer']){
  const ds=await read(api.query,{itemId:m.datasources[name].id});assert(ds?.path===m.datasources[name].path&&ds.template.name==='AgencyPriorities','A priority datasource is missing or changed.');
 }
 const disclosure=await read(api.query,{itemId:m.sharedDisclosureId});assert(disclosure?.path==='/sitecore/content/LibertyMutual/liberty-mutual-public-site/Data/Disclosures/Product availability notice','Canonical public disclosure is missing or moved.');
 for(const[key,ids]of Object.entries(m.placeholderIds))for(const type of ['global','site']){
  const ph=await read(api.query,{itemId:ids[type]});const component=key==='headless-agency-priorities'?'AgencyPriorities':'SharedDisclosure';
  assert(ph&&ph.fields.find(f=>f.name==='Placeholder Key')?.value===key&&norm(ph.fields.find(f=>f.name==='Allowed Controls')?.value)===norm(m.renderings[component].id),'Portal placeholder restrictions do not match their exact component.');
 }
 for(const r of Object.values(m.renderings))assert(await read(api.query,{itemId:r.variantId}),'A portal rendering variant is missing.');
}
function expectedItem(before,target,after){const result=structuredClone(before);for(const version of result.versions){const f=version.fields.find(f=>f.name===target.field);assert(f,'Native target field disappeared.');f.value=after;}return result;}
async function capture(api,m){
 await prerequisites(api,m);const states={};for(const t of targets(m)){const i=await readItem(api.query,t.id);assert(i.path===t.path,'An existing portal identity moved.');assert(new Set(i.versions.map(v=>v.fields.find(f=>f.name===t.field)?.value)).size===1,'A shared target field differs across versions.');states[t.path]=i;}return states;
}
async function main(){
 const [environment,mode,file,...args]=process.argv.slice(2),apply=args.includes('--apply'),journal=args[2];
 assert(environment&&['--snapshot','--baseline'].includes(mode)&&path.isAbsolute(file||'')&&(!args.length||(args.length===3&&args[0]==='--apply'&&args[1]==='--journal'&&path.isAbsolute(journal||''))),'Usage: public-configure-portal-relevance.cjs ENV --snapshot /absolute/before.json OR ENV --baseline /absolute/before.json [--apply --journal /absolute/after.json]');
 assert(!(mode==='--snapshot'&&args.length),'Snapshot cannot apply.');if(apply)assert(!fs.existsSync(journal),'Refusing to overwrite a journal.');
 const api=connection(environment,apply),m=config(),states=await capture(api,m),ts=targets(m);
 const changes=ts.map(t=>({id:t.id,path:t.path,field:t.field,before:val(states[t.path],t.field),after:t.after(val(states[t.path],t.field))}));
 const snapshot={origin:api.origin,contractDigest:digest(m),capturedAt:new Date().toISOString(),states,changes};
 if(mode==='--snapshot'){assert(!fs.existsSync(file),'Refusing to overwrite a before-image.');writePrivate(file,snapshot);console.log('Captured four exact portal targets, all language/version fields, and unchanged native final layouts. No native writes.');return;}
 const before=JSON.parse(fs.readFileSync(file,'utf8'));assert(before.origin===api.origin&&before.contractDigest===digest(m),'Environment or source changed.');for(const t of ts)assert.deepEqual(semantic(states[t.path]),semantic(before.states[t.path]),'Portal content/configuration changed; preserve it and recapture.');
 console.log(JSON.stringify({mode:apply?'apply':'read-only',changes:changes.filter(c=>c.before!==c.after).map(c=>({id:c.id,path:c.path,field:c.field})),protected:'All existing rendering UIDs, datasource selections, versioned final layouts, personalization, experiments, and unrelated fields.'},null,2));if(!apply)return;
 const after={};for(const t of ts){const current=await readItem(api.query,t.id);assert.deepEqual(semantic(current),semantic(states[t.path]),'Target changed immediately before write.');const change=changes.find(c=>c.path===t.path);if(change.before!==change.after)await api.query('mutation($input:UpdateItemInput!){updateItem(input:$input){item{itemId path}}}',{input:{database:'master',language:'en',itemId:t.id,fields:[{name:t.field,value:change.after}]}});after[t.path]=await readItem(api.query,t.id);assert.deepEqual(semantic(after[t.path]),semantic(expectedItem(states[t.path],t,change.after)),'Readback detected an unrelated field/version change.');}
 writePrivate(journal,{...snapshot,after,completedAt:new Date().toISOString(),sourceReconciliation:changes.filter(c=>c.field==='Placeholders').map(c=>({path:c.path,field:c.field,value:c.after}))});
 console.log('Verified additive portal placements and all preserved native final layouts. Reconcile only the two layout Placeholders fields to their existing serialized definitions, then verify actual Preview/live rendering. No publication performed.');
}
module.exports={targets,appendIds,appendPlacements,placement};if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
