#!/usr/bin/env node
'use strict';
/** Read-only reconciliation of the official native site scaffold.
 * ENV --snapshot /absolute/private.json records exact current before-images.
 * ENV --capture derives public path/ID/template and non-personal settings from
 * live native content. No native mutation is performed.
 */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {ROOT,connection,read,writePrivate}=require('./campaign-native-client.cjs');
const {SITE,PROTECTED,format,inventory}=require('./public-native-state.cjs');
async function main(){
 const [environment,mode,file,...rest]=process.argv.slice(2);
 assert(environment&&['--capture','--snapshot'].includes(mode)&&!rest.length,'Usage: public-capture-scaffold.cjs ENV --capture OR ENV --snapshot /absolute/private.json');
 const api=connection(environment,false),items=await inventory(api.query);
 if(mode==='--snapshot'){
   assert(path.isAbsolute(file||'')&&!fs.existsSync(file),'Use a new absolute private snapshot path.');
   const protectedItems=[];for(const p of PROTECTED)protectedItems.push({path:p,item:await read(api.query,{path:p})});
   writePrivate(file,{schemaVersion:1,origin:api.origin,sitePath:SITE,capturedAt:new Date().toISOString(),publicItems:items,protected:protectedItems});
   console.log(`Captured ${items.length} public site items and protected configuration before-images. No native writes.`);return;
 }
 assert(!file,'Capture takes no filename.');
 const identities=Object.fromEntries(items.map(i=>[i.path,format(i.itemId)]).sort((a,b)=>a[0].localeCompare(b[0])));
 const scaffolds={};
 for(const item of items){
   // Only retain non-personal, nonempty configuration. Platform/author audit,
   // locking, security, and browser data remain in the private before-image.
   const fields=[];let after;
   for(let page=0;page<10;page++){
     const data=await api.query('query($where:ItemQueryInput!,$after:String){item(where:$where){fields(first:100,after:$after,excludeStandardFields:false,ownFields:false,withLanguageFallback:false){nodes{fieldId name value templateField{versioning}}pageInfo{hasNextPage endCursor}}}}',{where:{database:'master',language:'en',itemId:item.itemId},after});
     const connection=data.item.fields;fields.push(...connection.nodes.filter(f=>f.value&&(!f.name.startsWith('__')||['__Masters','__Renderings','__Final Renderings'].includes(f.name))));
     if(!connection.pageInfo.hasNextPage)break;
     assert(page<9,'Incomplete scaffold field inventory.');after=connection.pageInfo.endCursor;
   }
   scaffolds[item.path]={template:format(item.template.templateId),fields:fields.map(f=>({id:format(f.fieldId),name:f.name,value:f.value,versioning:f.templateField.versioning}))};
 }
 const base=path.join(ROOT,'authoring/items/liberty-mutual-public');
 fs.writeFileSync(path.join(base,'public-site-identities.json'),JSON.stringify(identities,null,2)+'\n');
 fs.writeFileSync(path.join(base,'public-native-scaffold.json'),JSON.stringify(scaffolds,null,2)+'\n');
 console.log(`Reconciled ${items.length} official public-site identities and non-personal scaffold fields. No native writes.`);
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
