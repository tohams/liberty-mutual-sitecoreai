#!/usr/bin/env node
'use strict';
/** Corrects only missing native partial-signature prefixes on three page layouts.
 * Rendering UIDs, fields, datasource references, variants, and order remain intact.
 * ENV --snapshot /absolute/before.json
 * ENV --baseline /absolute/before.json [--apply --journal /absolute/after.json]
 */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {ROOT,connection,read,value,writePrivate}=require('./campaign-native-client.cjs');
const {SITE,semantic,digest}=require('./public-native-state.cjs');
const {xmlShape}=require('./configure-product-spotlight.cjs');
const same=(a,b)=>JSON.stringify(xmlShape(a))===JSON.stringify(xmlShape(b));
const corrected=xml=>xml.replaceAll('/headless-main/headless-public-','/headless-main/sxa-public-page-body/headless-public-');
async function main(){
 const [environment,mode,file,...args]=process.argv.slice(2),apply=args.includes('--apply'),journal=args[2];
 assert(environment&&['--snapshot','--baseline'].includes(mode)&&path.isAbsolute(file||'')&&(!args.length||(args.length===3&&args[0]==='--apply'&&args[1]==='--journal'&&path.isAbsolute(journal||''))),'Usage: public-configure-page-slots.cjs ENV --snapshot /absolute/before.json OR ENV --baseline /absolute/before.json [--apply --journal /absolute/after.json]');
 assert(!(mode==='--snapshot'&&args.length),'Snapshot cannot apply.');if(apply)assert(!fs.existsSync(journal),'Refusing to overwrite a journal.');
 const api=connection(environment,apply),model=JSON.parse(fs.readFileSync(path.join(ROOT,'authoring/items/liberty-mutual-public/public-contract.json'),'utf8'));
 const targets=[SITE+'/Home',SITE+'/Home/bundling',SITE+'/Presentation/Page Branches/Landing page/$name'].map(p=>model.records.find(r=>r.path===p));
 const states={};for(const r of targets){states[r.path]=await read(api.query,{itemId:r.id});assert(states[r.path]?.path===r.path,'Page identity changed.');assert(same(corrected(value(states[r.path],'__Renderings')),r.fields.__Renderings),'Existing page layout contains unrelated changes; preserve and review.');assert(!value(states[r.path],'__Final Renderings'),'Page has a versioned layout; inspect it before changing shared placements.');}
 const snapshot={origin:api.origin,contractDigest:digest(model),states,capturedAt:new Date().toISOString()};
 if(mode==='--snapshot'){assert(!fs.existsSync(file),'Refusing to overwrite a before-image.');writePrivate(file,snapshot);console.log('Captured three exact page layouts and verified only partial-prefix corrections are needed. No native writes.');return;}
 const before=JSON.parse(fs.readFileSync(file,'utf8'));assert(before.origin===api.origin&&before.contractDigest===digest(model),'Environment or source changed.');for(const r of targets)assert.deepEqual(semantic(states[r.path]),semantic(before.states[r.path]),'Page changed; preserve and recapture.');
 console.log(JSON.stringify({mode:apply?'apply':'read-only',targets:targets.map(r=>({id:r.id,path:r.path,field:'__Renderings'}))},null,2));if(!apply)return;
 const after={};for(const r of targets){const current=await read(api.query,{itemId:r.id});assert.deepEqual(semantic(current),semantic(states[r.path]),'Page changed immediately before write.');const beforeXml=value(current,'__Renderings'),afterXml=corrected(beforeXml);if(beforeXml!==afterXml)await api.query('mutation($input:UpdateItemInput!){updateItem(input:$input){item{itemId path}}}',{input:{database:'master',language:'en',itemId:r.id,fields:[{name:'__Renderings',value:afterXml}]}});after[r.path]=await read(api.query,{itemId:r.id});assert(same(value(after[r.path],'__Renderings'),afterXml),'Page-slot readback failed.');}
 writePrivate(journal,{...snapshot,after,completedAt:new Date().toISOString()});console.log('Verified native partial-signature prefixes. Requery Preview layout and observe resolved Hero, Article, Promotion, and Disclosure fields.');
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
