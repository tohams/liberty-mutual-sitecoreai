#!/usr/bin/env node
'use strict';
/** One-time correction of fields imported as literal empty quotes by SCS.
 * Only manifest-declared empty fields with exact native value `""` qualify.
 * Already edited/nonempty values are preserved. Native writes require a fresh
 * before-image and an explicit --apply; no publication, deletion, or retries.
 * ENV --snapshot /absolute/before.json
 * ENV --baseline /absolute/before.json [--apply --journal /absolute/after.json]
 */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {ROOT,connection,read,value,writePrivate}=require('./campaign-native-client.cjs');
const {semantic,digest}=require('./public-native-state.cjs');
function intended(){const model=JSON.parse(fs.readFileSync(path.join(ROOT,'authoring/items/liberty-mutual-public/public-contract.json'),'utf8'));return {model,targets:model.records.map(r=>({...r,emptyFields:Object.entries(r.fields).filter(([,v])=>v==='').map(([k])=>k)})).filter(r=>r.emptyFields.length)};}
async function main(){
 const [environment,mode,file,...args]=process.argv.slice(2),apply=args.includes('--apply'),journal=args[2];
 assert(environment&&['--snapshot','--baseline'].includes(mode)&&path.isAbsolute(file||'')&&(!args.length||(args.length===3&&args[0]==='--apply'&&args[1]==='--journal'&&path.isAbsolute(journal||''))),'Usage: public-repair-empty-fields.cjs ENV --snapshot /absolute/before.json OR ENV --baseline /absolute/before.json [--apply --journal /absolute/after.json]');
 assert(!(mode==='--snapshot'&&args.length),'Snapshot cannot apply.');if(apply)assert(!fs.existsSync(journal),'Refusing to overwrite a journal.');
 const api=connection(environment,apply),{model,targets}=intended(),states={};
 assert(targets.length<30&&targets.every(r=>r.path.startsWith(model.sitePath+'/')||r.path.startsWith('/sitecore/layout/Renderings/Project/LibertyMutualPublic/')),'Repair exceeded its public-owned bound.');
 for(const target of targets)states[target.path]=await read(api.query,{itemId:target.id});
 const changes=targets.flatMap(target=>{const item=states[target.path];assert(item?.path===target.path,'Repair target moved or is missing.');const fields=target.emptyFields.filter(name=>value(item,name)==='""');return fields.length?[{id:target.id,path:target.path,fields:fields.map(name=>({name,before:'""',after:''}))}]:[];});
 const snapshot={origin:api.origin,contractDigest:digest(model),capturedAt:new Date().toISOString(),states,changes};
 if(mode==='--snapshot'){assert(!fs.existsSync(file),'Refusing to overwrite a before-image.');writePrivate(file,snapshot);console.log(JSON.stringify({mode:'snapshot',changes},null,2));return;}
 const before=JSON.parse(fs.readFileSync(file,'utf8'));assert(before.origin===api.origin&&before.contractDigest===digest(model),'Environment or source changed.');
 for(const target of targets)assert.deepEqual(semantic(states[target.path]),semantic(before.states[target.path]),'A repair target changed; preserve it and recapture.');
 console.log(JSON.stringify({mode:apply?'apply':'read-only',changes},null,2));if(!apply)return;
 for(const change of changes){
   const current=await read(api.query,{itemId:change.id});assert.deepEqual(semantic(current),semantic(states[change.path]),'Target changed immediately before write.');
   await api.query('mutation($input:UpdateItemInput!){updateItem(input:$input){item{itemId path}}}',{input:{database:'master',language:'en',itemId:change.id,version:current.version,fields:change.fields.map(f=>({name:f.name,value:''}))}});
   const after=await read(api.query,{itemId:change.id});assert(change.fields.every(f=>value(after,f.name)===''),'Empty-field readback failed.');
 }
 const after={};for(const change of changes)after[change.path]=await read(api.query,{itemId:change.id});writePrivate(journal,{...snapshot,after,completedAt:new Date().toISOString()});
 console.log('Verified exact literal-quote corrections. Authored values and publication were preserved.');
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
