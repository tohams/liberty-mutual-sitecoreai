#!/usr/bin/env node
'use strict';
/** Supported native GraphQL media upload using the ordinary CLI login.
 * ENV /absolute/file "Item name" "Alt text" --snapshot /absolute/before.json
 * ENV /absolute/file "Item name" "Alt text" --baseline /absolute/before.json [--apply --journal /absolute/after.json]
 * Only creates an absent direct child of this public site's media folder.
 * Never overwrites, publishes, binds content fields, prints tokens/signed URLs,
 * or automatically retries an uncertain upload.
 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {ROOT,connection,read,value,writePrivate}=require('./campaign-native-client.cjs');
const {norm}=require('./public-native-state.cjs');
const PARENT='/sitecore/media library/Project/LibertyMutual/liberty-mutual-public-site';
const PARENT_ID='ef9fbb4d-4284-45e1-bc5c-96424e1b4dbb';
function bearer(environment){
 const cfg=JSON.parse(fs.readFileSync(path.join(ROOT,'.sitecore/user.json'),'utf8'));
 const find=n=>Object.entries(cfg.endpoints).find(([key])=>key.toLowerCase()===n.toLowerCase())?.[1];
 const endpoint=find(environment);assert(endpoint?.allowWrite===true,'Use the configured writable CLI endpoint.');
 let auth=endpoint;const seen=new Set();while(auth.ref){const ref=auth.ref.toLowerCase();assert(!seen.has(ref),'Authentication reference cycle.');seen.add(ref);auth=find(ref);assert(auth,'Missing CLI reference.');}
 assert(auth.accessToken,'Run the ordinary CLI login.');return auth.accessToken;
}
async function main(){
 const [environment,file,name,alt,mode,snapshotFile,...args]=process.argv.slice(2),apply=args.includes('--apply'),journal=args[2];
 assert(environment&&path.isAbsolute(file||'')&&name&&!/[\\/{}]/.test(name)&&name.length<100&&['--snapshot','--baseline'].includes(mode)&&path.isAbsolute(snapshotFile||'')&&(!args.length||(args.length===3&&args[0]==='--apply'&&args[1]==='--journal'&&path.isAbsolute(journal||''))),'Usage: public-upload-media.cjs ENV /absolute/file "Item name" "Alt text" --snapshot|--baseline /absolute/private.json [--apply --journal /absolute/after.json]');
 assert(!(mode==='--snapshot'&&args.length),'Snapshot cannot apply.');if(apply)assert(!fs.existsSync(journal),'Refusing to overwrite a journal.');
 const ext=path.extname(file).toLowerCase(),mime={'.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif'}[ext];assert(mime,'Use a supported image asset.');
 const bytes=fs.readFileSync(file);assert(bytes.length>0&&bytes.length<20*1024*1024,'Image must be nonempty and smaller than20MB.');
 const sha256=crypto.createHash('sha256').update(bytes).digest('hex'),api=connection(environment,apply),target=PARENT+'/'+name;
 const parent=await read(api.query,{itemId:PARENT_ID});assert(parent?.path===PARENT,'Public media folder identity changed.');
 const absent=await api.query('query($p:String!){item(where:{database:"master",path:$p,language:"en"}){itemId path}}',{p:target});assert(!absent.item,'Target media already exists. Inspect and reuse it; never overwrite or retry blindly.');
 const snapshot={schemaVersion:1,origin:api.origin,parentId:parent.itemId,target,file,bytes:bytes.length,sha256,alt,capturedAt:new Date().toISOString()};
 if(mode==='--snapshot'){assert(!fs.existsSync(snapshotFile),'Refusing to overwrite a before-image.');writePrivate(snapshotFile,snapshot);console.log(JSON.stringify({mode:'snapshot',target,bytes:bytes.length,sha256},null,2));return;}
 const before=JSON.parse(fs.readFileSync(snapshotFile,'utf8'));assert(before.origin===api.origin&&norm(before.parentId)===norm(parent.itemId)&&before.target===target&&before.file===file&&before.sha256===sha256&&before.alt===alt,'Environment, media input, or target changed.');
 console.log(JSON.stringify({mode:apply?'apply':'read-only',target,bytes:bytes.length,sha256},null,2));if(!apply)return;
 const signed=await api.query('mutation($input:UploadMediaInput!){uploadMedia(input:$input){presignedUploadUrl}}',{input:{database:'master',language:'en',itemPath:target.replace('/sitecore/media library/',''),alt,includeExtensionInItemName:false,overwriteExisting:false,versioned:false}});
 const upload=new URL(signed.uploadMedia.presignedUploadUrl);assert(upload.origin===api.origin&&upload.pathname==='/sitecore/api/v1/authoring/media/upload','Upload endpoint did not match the same trusted CM.');
 const form=new FormData();form.append('file',new Blob([bytes],{type:mime}),path.basename(file));
 let response,result;try{response=await fetch(upload,{method:'POST',headers:{Authorization:'Bearer '+bearer(environment)},body:form,redirect:'error',signal:AbortSignal.timeout(30000)});result=await response.json();}catch{throw new Error('Upload result not confirmed. Read the target media path before retrying.');}
 assert(response.ok,'Upload failed. Private response suppressed; read target before retry.');
 const item=await read(api.query,{path:target});assert(item?.path===target&&norm(item.parent.itemId)===norm(PARENT_ID),'Uploaded media identity was not confirmed.');
 const size=value(item,'Size');if(size)assert(Number(size)===bytes.length,'Native media size differs from source.');
 const mediaId='{'+item.itemId.replace(/[{}-]/g,'').replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/,'$1-$2-$3-$4-$5').toUpperCase()+'}';
 const imageField='<image mediaid="'+mediaId+'" alt="'+String(alt||'').replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;')+'" />';
 writePrivate(journal,{...snapshot,completedAt:new Date().toISOString(),nativeResponse:result,item,imageField});
 console.log(JSON.stringify({uploaded:true,itemId:item.itemId,path:item.path,imageField,published:false},null,2));
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
