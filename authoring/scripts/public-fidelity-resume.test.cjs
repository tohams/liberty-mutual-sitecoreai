'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {resumeActions}=require('./public-configure-fidelity.cjs');
const workflow={draft:'ce5c0c95-af32-5457-849b-11e8efaf72d7'};
const field=(name,value,id)=>({fieldId:String(id).padStart(32,'0'),name,value});
function version(n,logo,state='approved'){
 const date=n===3?'20261101T040334Z':'20261101T032218Z';
 return {language:'en',version:n,fields:[field('logo',logo,1),field('__Workflow state',state,2),field('__Created',date,3),field('__Valid from',date,4),field('body','Preserve approved content.',5)]};
}
function fixture(){
 const path='/sitecore/content/LibertyMutual/liberty-mutual-public-site/Presentation/Partial Designs/Header/Data/Header';
 const before={itemId:'11111111-1111-5111-8111-111111111111',path,parent:{itemId:'22222222-2222-5222-8222-222222222222'},template:{templateId:'33333333-3333-5333-8333-333333333333'},versions:[version(1,'old1'),version(2,'old2')]};
 const current=structuredClone(before);current.versions.push(version(3,'new3','{'+workflow.draft.toUpperCase()+'}'));
 const log={states:{[path]:before},changes:[{id:before.itemId,path,fields:{logo:'new3'}}],events:[{action:'version-created',itemId:before.itemId,version:3}]};
 return {path,before,current,log};
}
test('resume recognizes an already saved v3 and never proposes another version',()=>{
 const {path,current,log}=fixture();const result=resumeActions(log,{[path]:current},workflow);
 assert.equal(result[0].action,'verify-existing-draft-without-rewrite');assert.equal(result[0].version,3);
});
test('resume rejects changes to historical content, extra versions, and unexplained AddVersion intents',()=>{
 const {path,before,current,log}=fixture();
 const changed=structuredClone(current);changed.versions[0].fields.find(f=>f.name==='body').value='Changed old version';
 assert.throws(()=>resumeActions(log,{[path]:changed},workflow),/existing version/);
 const extra=structuredClone(current);extra.versions.push(version(4,'extra'));
 assert.throws(()=>resumeActions(log,{[path]:extra},workflow),/inventory/);
 const ambiguous={...log,events:[{action:'adding-version',itemId:before.itemId}]};
 assert.throws(()=>resumeActions(ambiguous,{[path]:before},workflow),/unconfirmed AddVersion/);
});
test('only a target with no recorded version creation and an unchanged before-image can start',()=>{
 const {path,before,log}=fixture();log.events=[];
 assert.equal(resumeActions(log,{[path]:before},workflow)[0].action,'create-only-unstarted-draft');
});
