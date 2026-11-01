#!/usr/bin/env node
'use strict';
/** One-time, three-item public-site initialization. Never a normal deploy step.
 * ENV --snapshot /absolute/before.json
 * ENV --baseline /absolute/before.json [--apply --journal /absolute/after.json]
 * Captures complete native before-images, refuses concurrent changes, runs only
 * the exact PublicBootstrap module, then verifies template and field readback.
 * Portal/Default configuration is protected throughout. No publication occurs.
 */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const {ROOT,connection,read,value,writePrivate}=require('./campaign-native-client.cjs');
const {SITE,PROTECTED,semantic,digest,norm}=require('./public-native-state.cjs');
const TARGETS=[SITE,SITE+'/Settings',SITE+'/Home'];
function contract(){return JSON.parse(fs.readFileSync(path.join(ROOT,'authoring/items/liberty-mutual-public/public-contract.json'),'utf8'));}
async function capture(api){const records={};for(const p of [...TARGETS,...PROTECTED])records[p]=await read(api.query,{path:p});return records;}
async function main(){
 const [environment,mode,file,...args]=process.argv.slice(2);
 assert(environment&&['--snapshot','--baseline'].includes(mode)&&path.isAbsolute(file||''),'Usage: public-bootstrap.cjs ENV --snapshot /absolute/before.json OR ENV --baseline /absolute/before.json [--apply --journal /absolute/after.json]');
 const apply=args.includes('--apply'),j=args.indexOf('--journal'),journal=j>=0?args[j+1]:null;
 assert(!args.length||(args.length===3&&args[0]==='--apply'&&args[1]==='--journal'&&path.isAbsolute(journal||'')),'Apply requires an absolute private journal path.');
 if(apply)assert(!fs.existsSync(journal),'Refusing to overwrite a journal.');
 assert(!(mode==='--snapshot'&&args.length),'Snapshot takes no apply arguments.');
 const api=connection(environment,apply),model=contract(),state=await capture(api);
 assert(TARGETS.every(p=>state[p]&&state[p].path===p),'Official public-site scaffold is missing.');
 const records=TARGETS.map(p=>model.records.find(r=>r.path===p));
 assert(records.every((r,n)=>r&&norm(r.id)===norm(state[TARGETS[n]].itemId)),'Captured native identities do not match the source contract.');
 const snapshot={schemaVersion:1,origin:api.origin,capturedAt:new Date().toISOString(),contractDigest:digest(model),state};
 if(mode==='--snapshot'){
   assert(!fs.existsSync(file),'Refusing to overwrite a before-image.');writePrivate(file,snapshot);
   console.log('Captured exactly three public bootstrap targets and protected Portal/Default configuration. No native writes.');return;
 }
 const before=JSON.parse(fs.readFileSync(file,'utf8'));
 assert(before.origin===api.origin&&before.contractDigest===digest(model),'Environment or reviewed source changed; capture a new before-image.');
 assert.deepEqual(Object.fromEntries(Object.entries(state).map(([p,i])=>[p,semantic(i)])),Object.fromEntries(Object.entries(before.state).map(([p,i])=>[p,semantic(i)])),'Native bootstrap or protected configuration changed; preserve and recapture.');
 const command=['sitecore','ser','push','-n',environment,'-i','LibertyMutual.PublicBootstrap',...(apply?[]:['--what-if'])];
 const result=spawnSync('dotnet',command,{cwd:ROOT,encoding:'utf8'});
 // CLI output contains paths/changes only, never authentication configuration.
 if(result.stdout)process.stdout.write(result.stdout);
 if(result.stderr)process.stderr.write(result.stderr);
 assert(result.status===0,'The exact native bootstrap did not complete. Read back before retrying.');
 if(!apply)return;
 const after=await capture(api);
 for(const record of records){
   const native=after[record.path];assert(norm(native.itemId)===norm(record.id)&&norm(native.template.templateId)===norm(record.template),'Bootstrap identity/template readback failed.');
   for(const [name,expected] of Object.entries(record.fields)){
     if(name==='__Created')continue;
     assert(value(native,name)===expected,`Bootstrap field readback failed: ${record.path} / ${name}.`);
   }
 }
 for(const p of PROTECTED)assert.deepEqual(semantic(after[p]),semantic(before.state[p]),'Portal or shared Default configuration changed.');
 assert(!fs.existsSync(journal),'Refusing to overwrite a journal.');writePrivate(journal,{...snapshot,completedAt:new Date().toISOString(),after});
 console.log('Verified public bootstrap and unchanged Portal/Default configuration. Content is still subject to native approval and publication.');
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
