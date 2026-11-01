#!/usr/bin/env node
'use strict';
/** Read-only native inventory and verification for the public slice.
 * ENV --snapshot /absolute/private.json captures native + protected identities.
 * ENV --verify /absolute/private.json checks protected portal/Default settings.
 * ENV --identities captures only new site's path/ID pairs into the source map.
 * No operation in this file mutates Sitecore, publishes, or changes access.
 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const {ROOT,connection,read,writePrivate} = require('./campaign-native-client.cjs');
const SITE = '/sitecore/content/LibertyMutual/liberty-mutual-public-site';
const PROTECTED = [
  '/sitecore/content/LibertyMutual/liberty-mutual-agent-portal/Settings',
  '/sitecore/content/LibertyMutual/liberty-mutual-agent-portal/Settings/Site Grouping/liberty-mutual-agent-portal',
  '/sitecore/system/Settings/Services/Rendering Hosts/Default',
  '/sitecore/system/Settings/Services/Rendering Hosts/liberty-mutual-agent-portal',
];
const META = new Set(['__Revision','__Shared revision','__Unversioned revision','__Updated','__Updated by']);
const norm = s => String(s||'').replace(/[{}-]/g,'').toLowerCase();
function semantic(i) {
  if (!i) return null;
  return {id:norm(i.itemId),path:i.path,template:norm(i.template.templateId),
    fields:i.fields.filter(f=>!META.has(f.name)).map(f=>[norm(f.fieldId),f.name,f.value]).sort((a,b)=>a[0].localeCompare(b[0])),
    versions:i.versions.map(v=>`${v.language.name}:${v.version}`).sort()};
}
const digest = data => crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
async function inventory(query) {
  const result=[]; const pending=[SITE];
  while (pending.length) {
    assert(result.length<500,'Public site inventory exceeded its declared bound.');
    const item=await read(query,{path:pending.shift()});
    assert(item && (item.path===SITE||item.path.startsWith(SITE+'/')),'Public site is missing or moved.');
    result.push(item);
    pending.push(...item.children.map(c=>c.path));
  }
  return result;
}
async function main() {
  const [environment,mode,file,...rest]=process.argv.slice(2);
  assert(environment && ['--snapshot','--verify','--identities'].includes(mode) && !rest.length,'Usage: public-native-state.cjs ENV --snapshot|--verify /absolute/private.json OR ENV --identities');
  const api=connection(environment,false);
  if (mode==='--identities') {
    assert(!file,'The identities action has no filename argument.');
    const items=await inventory(api.query);
    const output=path.join(ROOT,'authoring/items/liberty-mutual-public/public-site-identities.json');
    const identities=Object.fromEntries(items.map(i=>[i.path, i.itemId.match(/.{8}/g) ? format(i.itemId) : i.itemId]).sort((a,b)=>a[0].localeCompare(b[0])));
    fs.writeFileSync(output,JSON.stringify(identities,null,2)+'\n');
    console.log(`Captured ${items.length} public site identities only. No native writes.`);return;
  }
  assert(path.isAbsolute(file||''),'Use an absolute private snapshot path.');
  const protectedItems=[];
  for (const p of PROTECTED) protectedItems.push({path:p,item:await read(api.query,{path:p})});
  if(mode==='--verify') {
    const before=JSON.parse(fs.readFileSync(file,'utf8'));
    assert(before.origin===api.origin && before.sitePath===SITE,'Snapshot environment changed.');
    assert.deepEqual(protectedItems.map(p=>({path:p.path,item:semantic(p.item)})),before.protected.map(p=>({path:p.path,item:semantic(p.item)})),'Portal or shared Default configuration changed.');
    console.log('Verified preserved Portal and shared Default configuration. No native writes.');return;
  }
  assert(!fs.existsSync(file),'Refusing to overwrite an existing before-image.');
  const publicItems=await inventory(api.query);
  const snapshot={schemaVersion:1,origin:api.origin,sitePath:SITE,capturedAt:new Date().toISOString(),protected:protectedItems,publicItems};
  writePrivate(file,snapshot);
  console.log(JSON.stringify({capturedAt:snapshot.capturedAt,publicItems:publicItems.length,protectedItems:protectedItems.length,digest:digest(snapshot)},null,2));
}
function format(id) {const s=norm(id);assert(/^[a-f\d]{32}$/.test(s),'Native ID is invalid.');return `${s.slice(0,8)}-${s.slice(8,12)}-${s.slice(12,16)}-${s.slice(16,20)}-${s.slice(20)}`;}
module.exports={SITE,PROTECTED,semantic,digest,norm,inventory,format};
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
