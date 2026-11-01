#!/usr/bin/env node
'use strict';
/** Read-only definition verification. Editorial seed values are intentionally
 * excluded: approved author edits must not be treated as deployment drift.
 * ENV [--report /absolute/private.json]
 */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {ROOT,connection,read,value,writePrivate}=require('./campaign-native-client.cjs');
const {norm}=require('./public-native-state.cjs');
const {xmlShape}=require('./configure-product-spotlight.cjs');
function equivalent(name,before,after){
 if(before===after)return true;
 if(['Rule','__Renderings','__Final Renderings'].includes(name)&&before.trim()&&after.trim()){
   const root=name==='Rule'?'ruleset':'r';
   return JSON.stringify(xmlShape(before,root))===JSON.stringify(xmlShape(after,root));
 }
 return false;
}
async function main(){
 const [environment,flag,file,...rest]=process.argv.slice(2);
 assert(environment&&!rest.length&&(!flag||(flag==='--report'&&path.isAbsolute(file||''))),'Usage: public-verify-native.cjs ENV [--report /absolute/private.json]');
 if(file)assert(!fs.existsSync(file),'Refusing to overwrite an existing report.');
 const api=connection(environment,false),model=JSON.parse(fs.readFileSync(path.join(ROOT,'authoring/items/liberty-mutual-public/public-contract.json'),'utf8'));
 const records=model.records.filter(r=>['templates','renderings','placeholders','presentation'].includes(r.bucket));
 const issues=[];let cursor=0;
 async function worker(){while(cursor<records.length){const expected=records[cursor++],actual=await read(api.query,{itemId:expected.id});
   if(!actual){issues.push({path:expected.path,issue:'missing'});continue;}
   if(actual.path!==expected.path||norm(actual.template.templateId)!==norm(expected.template)){issues.push({path:expected.path,issue:'identity/template mismatch'});continue;}
   for(const[name,wanted]of Object.entries(expected.fields)){
     if(name==='__Created')continue;
     if(!equivalent(name,value(actual,name),wanted))issues.push({path:expected.path,field:name,expected:wanted,actual:value(actual,name)});
   }
 }}
 await Promise.all([worker(),worker(),worker(),worker()]);
 const report={checkedAt:new Date().toISOString(),origin:api.origin,definitions:records.length,issues:issues.sort((a,b)=>(a.path+'/'+(a.field||'')).localeCompare(b.path+'/'+(b.field||'')))};
 if(file)writePrivate(file,report);
 console.log(JSON.stringify({definitions:records.length,issues:report.issues},null,2));
 if(issues.length)process.exitCode=1;
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
