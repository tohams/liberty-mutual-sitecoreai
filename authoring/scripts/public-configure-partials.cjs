#!/usr/bin/env node
'use strict';
/** Three-item headless partial initialization. Adds only versioned Final
 * Renderings with original UIDs, leaving Shared Renderings intact for recovery.
 * ENV --snapshot /absolute/before.json
 * ENV --baseline /absolute/before.json [--apply --journal /absolute/after.json]
 */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {ROOT,connection,read,value,writePrivate}=require('./campaign-native-client.cjs');
const {SITE,semantic,digest}=require('./public-native-state.cjs');
const {xmlShape}=require('./configure-product-spotlight.cjs');
const sameXml=(a,b)=>JSON.stringify(xmlShape(a))===JSON.stringify(xmlShape(b));
async function main(){
 const [environment,mode,file,...args]=process.argv.slice(2),apply=args.includes('--apply'),journal=args[2];
 assert(environment&&['--snapshot','--baseline'].includes(mode)&&path.isAbsolute(file||'')&&(!args.length||(args.length===3&&args[0]==='--apply'&&args[1]==='--journal'&&path.isAbsolute(journal||''))),'Usage: public-configure-partials.cjs ENV --snapshot /absolute/before.json OR ENV --baseline /absolute/before.json [--apply --journal /absolute/after.json]');
 assert(!(mode==='--snapshot'&&args.length),'Snapshot cannot apply.');if(apply)assert(!fs.existsSync(journal),'Refusing to overwrite a journal.');
 const api=connection(environment,apply),model=JSON.parse(fs.readFileSync(path.join(ROOT,'authoring/items/liberty-mutual-public/public-contract.json'),'utf8'));
 const targets=['Header','Page body','Footer'].map(name=>model.records.find(r=>r.path===SITE+'/Presentation/Partial Designs/'+name));
 const states={};for(const r of targets){assert(r,'Missing partial source contract.');states[r.path]=await read(api.query,{itemId:r.id});assert(states[r.path]?.path===r.path,'Partial identity changed.');assert(sameXml(value(states[r.path],'__Renderings'),r.fields.__Renderings),'Partial shared layout changed; preserve and review.');assert(!value(states[r.path],'__Final Renderings')||sameXml(value(states[r.path],'__Final Renderings'),r.fields['__Final Renderings']),'Partial has an unreviewed final layout.');}
 const snapshot={origin:api.origin,contractDigest:digest(model),states,capturedAt:new Date().toISOString()};
 if(mode==='--snapshot'){assert(!fs.existsSync(file),'Refusing to overwrite a before-image.');writePrivate(file,snapshot);console.log('Captured exactly three public partial before-images. No native writes.');return;}
 const before=JSON.parse(fs.readFileSync(file,'utf8'));assert(before.origin===api.origin&&before.contractDigest===digest(model),'Environment or source changed.');
 for(const r of targets)assert.deepEqual(semantic(states[r.path]),semantic(before.states[r.path]),'Partial changed; preserve and recapture.');
 console.log(JSON.stringify({mode:apply?'apply':'read-only',changes:targets.filter(r=>!sameXml(value(states[r.path],'__Final Renderings'),r.fields['__Final Renderings'])).map(r=>({id:r.id,path:r.path,field:'__Final Renderings'}))},null,2));if(!apply)return;
 const after={};for(const r of targets){const current=await read(api.query,{itemId:r.id});assert.deepEqual(semantic(current),semantic(states[r.path]),'Partial changed immediately before write.');if(!sameXml(value(current,'__Final Renderings'),r.fields['__Final Renderings']))await api.query('mutation($input:UpdateItemInput!){updateItem(input:$input){item{itemId path}}}',{input:{database:'master',language:'en',itemId:r.id,version:current.version,fields:[{name:'__Final Renderings',value:r.fields['__Final Renderings']}]}});after[r.path]=await read(api.query,{itemId:r.id});assert(sameXml(value(after[r.path],'__Final Renderings'),r.fields['__Final Renderings'])&&sameXml(value(after[r.path],'__Renderings'),r.fields.__Renderings),'Partial readback failed.');}
 writePrivate(journal,{...snapshot,after,completedAt:new Date().toISOString()});
 console.log('Verified three versioned partial layouts and unchanged shared layouts. Verify generated sxa-signature placeholder settings and actual Layout Service children next.');
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
