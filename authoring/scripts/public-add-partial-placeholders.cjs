#!/usr/bin/env node
'use strict';
/** Adds exactly three missing, restricted SXA partial companion settings.
 * ENV --snapshot /absolute/before.json
 * ENV --baseline /absolute/before.json [--apply --journal /absolute/after.json]
 * Refuses any pre-existing path or ID. No partial, page, global placeholder,
 * portal, or publication changes are included in this module.
 */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const {ROOT,connection,read,value,writePrivate}=require('./campaign-native-client.cjs');
const {SITE,digest,norm}=require('./public-native-state.cjs');
async function main(){
 const [environment,mode,file,...args]=process.argv.slice(2),apply=args.includes('--apply'),journal=args[2];
 assert(environment&&['--snapshot','--baseline'].includes(mode)&&path.isAbsolute(file||'')&&(!args.length||(args.length===3&&args[0]==='--apply'&&args[1]==='--journal'&&path.isAbsolute(journal||''))),'Usage: public-add-partial-placeholders.cjs ENV --snapshot /absolute/before.json OR ENV --baseline /absolute/before.json [--apply --journal /absolute/after.json]');
 assert(!(mode==='--snapshot'&&args.length),'Snapshot cannot apply.');if(apply)assert(!fs.existsSync(journal),'Refusing to overwrite a journal.');
 const api=connection(environment,apply),model=JSON.parse(fs.readFileSync(path.join(ROOT,'authoring/items/liberty-mutual-public/public-contract.json'),'utf8'));
 const parent=await read(api.query,{path:SITE+'/Presentation/Placeholder Settings/Partial Design'});
 assert(parent,'Native partial placeholder folder is missing.');
 const targets=['Header','Page body','Footer'].map(label=>model.records.find(r=>r.path===parent.path+'/'+label));
 for(const r of targets){assert(r&&norm(r.parent)===norm(parent.itemId),'Source companion identity changed.');assert(!await read(api.query,{path:r.path})&&!await read(api.query,{itemId:r.id}),'A companion path/ID already exists; inspect it before retrying.');}
 const snapshot={origin:api.origin,contractDigest:digest(model),parentId:parent.itemId,capturedAt:new Date().toISOString(),targets};
 if(mode==='--snapshot'){assert(!fs.existsSync(file),'Refusing to overwrite a before-image.');writePrivate(file,snapshot);console.log('Verified three companion paths/IDs absent and captured the exact source contract. No native writes.');return;}
 const before=JSON.parse(fs.readFileSync(file,'utf8'));assert(before.origin===api.origin&&before.contractDigest===digest(model)&&norm(before.parentId)===norm(parent.itemId),'Environment, parent, or source changed.');
 const result=spawnSync('dotnet',['sitecore','ser','push','-n',environment,'-i','LibertyMutual.PublicPartialPlaceholders',...(apply?[]:['--what-if'])],{cwd:ROOT,encoding:'utf8'});if(result.stdout)process.stdout.write(result.stdout);if(result.stderr)process.stderr.write(result.stderr);assert(result.status===0,'Exact companion creation was not confirmed. Read back before retrying.');if(!apply)return;
 const after=[];for(const expected of targets){const actual=await read(api.query,{path:expected.path});assert(actual&&norm(actual.itemId)===norm(expected.id)&&norm(actual.template.templateId)===norm(expected.template),'Companion identity/template readback failed.');for(const name of ['Placeholder Key','Allowed Controls'])assert(value(actual,name)===expected.fields[name],'Companion restriction readback failed.');after.push(actual);}
 writePrivate(journal,{...snapshot,after,completedAt:new Date().toISOString()});console.log('Verified exact restricted SXA companions. Refresh native Layout Service and Page Builder to verify child rendering.');
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
