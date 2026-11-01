#!/usr/bin/env node
'use strict';
/** Dedicated public host/Settings configuration. Snapshot first, then apply the
 * exact same origins against that fresh before-image. No publication/deletion.
 * ENV EDITING_ORIGIN DELIVERY_ORIGIN --snapshot /absolute/before.json
 * ENV EDITING_ORIGIN DELIVERY_ORIGIN --baseline /absolute/before.json [--apply]
 * Native GraphQL has no compare-and-swap: coordinate the short write window.
 * Writes are never automatically retried after an uncertain response.
 */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {ROOT,connection,read,value,writePrivate}=require('./campaign-native-client.cjs');
const {SITE,PROTECTED,semantic,digest,norm}=require('./public-native-state.cjs');
const GROUP=SITE+'/Settings/Site Grouping/liberty-mutual-public-site';
const HOST='/sitecore/system/Settings/Services/Rendering Hosts/liberty-mutual-public-site';
const HOST_PARENT='/sitecore/system/Settings/Services/Rendering Hosts';
const HOST_TEMPLATE='bc71d442-3e4f-46ba-887c-746e54f9bb83';
function origin(s) {const u=new URL(s);assert(u.protocol==='https:'&&!u.username&&!u.password&&!u.search&&!u.hash&&u.pathname==='/'&&!u.port,'Use a plain HTTPS origin.');return u;}
function plan(editing,delivery,contract){return {
  [HOST]:{AppName:'liberty-mutual-public-site',ServerSideRenderingEngineApplicationUrl:editing.origin+'/',ServerSideRenderingEngineEndpointUrl:editing.origin+'/api/editing/render',ServerSideRenderingEngineConfigUrl:editing.origin+'/api/editing/config'},
  [GROUP]:{RenderingHost:'liberty-mutual-public-site',HostName:[...new Set([delivery.hostname,editing.hostname])].join('|'),TargetHostName:delivery.hostname,Scheme:'https'},
  [SITE+'/Settings']:{Name:'liberty-mutual-public-site',AppDatasourcesPath:'{'+format(contract.records.find(i=>i.path===SITE+'/Data').id)+'}',PlaceholdersPath:'{'+format(contract.records.find(i=>i.path==='/sitecore/layout/Placeholder Settings/Project/LibertyMutualPublic').id)+'}',RenderingsPath:'{'+format(contract.records.find(i=>i.path==='/sitecore/layout/Renderings/Project/LibertyMutualPublic').id)+'}',Templates:'{'+format(contract.records.find(i=>i.path==='/sitecore/templates/Project/LibertyMutualPublic').id)+'}'},
};}
function format(s){const n=norm(s);return `${n.slice(0,8)}-${n.slice(8,12)}-${n.slice(12,16)}-${n.slice(16,20)}-${n.slice(20)}`.toUpperCase();}
async function main(){
 const [environment,editingValue,deliveryValue,flag,file,applyFlag,...rest]=process.argv.slice(2);
 assert(environment&&['--snapshot','--baseline'].includes(flag)&&path.isAbsolute(file||'')&&!rest.length&&(!applyFlag||applyFlag==='--apply'),'Usage: public-configure-host.cjs ENV EDITING_ORIGIN DELIVERY_ORIGIN --snapshot|--baseline /absolute/private.json [--apply]');
 assert(!(flag==='--snapshot'&&applyFlag),'Capture before reviewing/applying.');
 const editing=origin(editingValue),delivery=origin(deliveryValue),api=connection(environment,!!applyFlag);
 const contract=JSON.parse(fs.readFileSync(path.join(ROOT,'authoring/items/liberty-mutual-public/public-contract.json'),'utf8'));
 const desired=plan(editing,delivery,contract),paths=[...new Set([...Object.keys(desired),HOST_PARENT,...PROTECTED])];
 const state={};for(const p of paths)state[p]=await read(api.query,{path:p});
 assert(state[GROUP]?.path===GROUP&&state[SITE+'/Settings']?.path===SITE+'/Settings'&&state[HOST_PARENT],'Create the official native public site before configuring its host.');
 assert(value(state[GROUP],'SiteName')==='liberty-mutual-public-site','Site grouping identity changed.');
 assert(value(state[GROUP],'POS')==='en=liberty-mutual-public-site','Preserve the independently registered public analytics mapping.');
 if(state[HOST])assert(norm(state[HOST].template.templateId)===norm(HOST_TEMPLATE),'Dedicated host template changed.');
 const changes=Object.entries(desired).map(([p,fields])=>({path:p,operation:state[p]?'update':'create',fields:Object.entries(fields).filter(([name,after])=>value(state[p]||{fields:[]},name)!==after).map(([name,after])=>({name,before:value(state[p]||{fields:[]},name),after}))}));
 const snapshot={schemaVersion:1,origin:api.origin,editing:editing.origin,delivery:delivery.origin,contractDigest:digest(contract),state,desired};
 if(flag==='--snapshot'){assert(!fs.existsSync(file),'Refusing to overwrite a before-image.');writePrivate(file,snapshot);console.log(JSON.stringify({mode:'snapshot',changes},null,2));return;}
 const before=JSON.parse(fs.readFileSync(file,'utf8'));
 assert(before.origin===api.origin&&before.editing===editing.origin&&before.delivery===delivery.origin&&before.contractDigest===digest(contract),'Environment, origins, or contract changed; capture a new before-image.');
 assert.deepEqual(Object.fromEntries(paths.map(p=>[p,semantic(state[p])])),Object.fromEntries(paths.map(p=>[p,semantic(before.state[p])])),'Native configuration changed; preserve the new values and recapture.');
 console.log(JSON.stringify({mode:applyFlag?'apply':'read-only',changes},null,2));if(!applyFlag)return;
 for(const [p,fields] of Object.entries(desired)){
   const fresh=await read(api.query,{path:p});assert.deepEqual(semantic(fresh),semantic(state[p]),'Target changed immediately before write.');
   const values=Object.entries(fields).map(([name,value])=>({name,value}));
   if(!fresh){const created=await api.query('mutation($input:CreateItemInput!){createItem(input:$input){item{itemId path}}}',{input:{database:'master',language:'en',parent:state[HOST_PARENT].itemId,templateId:HOST_TEMPLATE,name:'liberty-mutual-public-site',fields:values}});assert(created.createItem.item.path===HOST,'Unexpected dedicated host creation result.');}
   else if(changes.find(c=>c.path===p).fields.length)await api.query('mutation($input:UpdateItemInput!){updateItem(input:$input){item{itemId path}}}',{input:{database:'master',language:'en',itemId:fresh.itemId,fields:values}});
   const after=await read(api.query,{path:p});assert(Object.entries(fields).every(([name,v])=>value(after,name)===v),'Configuration readback failed.');
   if(p===GROUP)assert(value(after,'POS')===value(state[p],'POS'),'Public analytics mapping changed.');
 }
 for(const p of PROTECTED)assert.deepEqual(semantic(await read(api.query,{path:p})),semantic(state[p]),'Portal or shared Default settings changed.');
 console.log('Verified dedicated public host, public Settings, independent POS, and preserved Portal/Default configuration. Publish the public configuration explicitly.');
}
module.exports={origin,plan};if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
