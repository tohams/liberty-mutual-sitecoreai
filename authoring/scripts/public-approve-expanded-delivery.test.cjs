'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const H=require('./public-approve-expanded-delivery.cjs');
const W=require('./public-configure-editorial-workflow.cjs');
const actor='sitecore\\setup';
const start={cursor:'MA==',node:{date:'2026-11-01T04:00:00Z',user:actor,newState:{stateId:W.IDS.draft,displayName:'Draft'}}};
const event={date:'2026-11-01T04:01:00Z',user:actor,oldState:{stateId:W.IDS.draft,displayName:'Draft'},newState:{stateId:W.IDS.awaiting,displayName:'Awaiting approval'}};
test('finite source approval includes delivered records only, with exactly six revised versions and seven portal editorial records',()=>{
 const m=H.manifest();assert.equal(m.targets.length,196);assert.equal(m.targets.filter(t=>t.version>1).length,6);
 assert.equal(m.targets.filter(t=>t.path.includes('/liberty-mutual-agent-portal/')).length,7);
 assert(m.targets.every(t=>!t.path.includes('/Page Branches/')&&!t.path.includes('$name')&&!t.path.includes('/Authoring check')));
 assert(m.targets.every(t=>!['Data','Cards','Questions','Navigation','Columns','Links','Social','Legal'].includes(t.path.split('/').at(-1))));
});
test('v3 native start event is queried without nonexistent oldState, while all real transitions retain their old state',async()=>{
 let calls=0;
 const q=async(query,variables)=>{
  assert.equal(variables.item.version,3);
  if(calls++===0){assert.doesNotMatch(query,/oldState/);return {workflow:{workflowId:W.IDS.workflow,commands:{nodes:[],pageInfo:{hasNextPage:false}},history:{edges:[start,{cursor:'MQ==',node:(({oldState,...rest})=>rest)(event)}],pageInfo:{hasNextPage:false}}}};}
  assert.equal(variables.after,'MA==');assert.match(query,/oldState/);return {workflow:{history:{nodes:[event],pageInfo:{hasNextPage:false}}}};
 };
 const native=await H.details(q,{itemId:'header',version:3});assert.deepEqual(native.started,start);assert.deepEqual(native.history,[event]);
 H.verifyHistory({started:start,history:[]},native,W.IDS.draft,W.IDS.awaiting,actor);
 assert.throws(()=>H.verifyHistory({started:start,history:[]},{...native,history:[]},W.IDS.draft,W.IDS.awaiting,actor),/exactly one/);
});
function item(){return {itemId:'11111111-1111-5111-8111-111111111111',path:'/sitecore/content/LibertyMutual/liberty-mutual-public-site/Home',version:1,language:{name:'en'},template:{templateId:'22222222-2222-5222-8222-222222222222'},versions:[{version:1,language:{name:'en'}}],fields:[{fieldId:'a',name:'body',value:'Approved original text'},{fieldId:'b',name:'__Workflow',value:W.IDS.workflow},{fieldId:'c',name:'__Workflow state',value:W.IDS.draft}]};}
test('preceding versions and declared version inventory are preserved, with no relaxed business-field comparison',()=>{
 const before=item(),after=structuredClone(before);H.verifyPrior(before,after);
 after.fields[0].value='An unreviewed change';assert.throws(()=>H.verifyPrior(before,after),/preceding approved/);
 const current=item(),target={id:current.itemId,path:current.path,template:current.template.templateId,version:1,expected:{body:'Approved original text'}};
 H.assertTarget(current,target);current.versions.push({version:2,language:{name:'en'}});assert.throws(()=>H.assertTarget(current,target),/Unexpected language or version/);
});
test('journal progress records only native field changes and reconstructs exact expected content for safe resume',()=>{
 const before=item(),after=structuredClone(before);after.fields[2].value=W.IDS.awaiting;
 const patch=H.patchFrom(before,after);assert.equal(patch.length,1);assert.deepEqual(H.overlay(before,patch),after);
});
test('native CRLF serialization is equivalent while copy, JSON values, and meaningful whitespace remain protected',()=>{
 assert(H.sameExpected('search','{\n  "searchIndex": "source-id"\n}','{\r\n  "searchIndex": "source-id"\r\n}'));
 assert(H.sameExpected('body','First line\nSecond line','First line\r\nSecond line'));
 assert(!H.sameExpected('body','First line\nSecond line','First line\nChanged line'));
 assert(!H.sameExpected('body','A space matters','A  space matters'));
 assert(!H.sameExpected('search','{"source":"approved"}','{"source":"draft"}'));
});
test('only a blank public-page thumbnail can acknowledge the exact system-generated per-page media artifact',()=>{
 const before=item();before.template.templateId='a4de2222-c8a5-54d4-adee-bbad976a457c';before.fields.push({fieldId:'d',name:'__Thumbnail',value:''},{fieldId:'e',name:'__Created',value:'20261031T160000Z'});
 const image='<image mediaid="{44444444-4444-5444-8444-444444444444}" />';
 const row={target:{id:before.itemId,path:before.path,template:before.template.templateId},item:before};
 const media={itemId:'44444444-4444-5444-8444-444444444444',path:'/sitecore/media library/Project/LibertyMutual/liberty-mutual-public-site/System/1/1/1/1/thumbnail_11111111111151118111111111111111',template:{templateId:'f1828a2c7e5d4bbd98ca320474871548'},fields:[{name:'__Owner',value:'sitecore\\ThumbnailsGenerator'},{name:'__Created by',value:'sitecore\\\\ThumbnailsGenerator'},{name:'__Created',value:'20261101T041629Z'}]};
 const evidence=H.verifyThumbnailMedia(row,image,media,new Date('2026-11-01T05:00:00Z'));
 const after=structuredClone(before);after.fields.find(f=>f.name==='__Thumbnail').value=image;H.verifyPrior(before,after,evidence);
 assert.throws(()=>H.verifyThumbnailMedia(row,image,{...media,path:media.path.replace('/System/','/Assets/')},new Date('2026-11-01T05:00:00Z')),/exact native/);
 const authored=structuredClone(row);authored.item.fields.find(f=>f.name==='__Thumbnail').value='<image mediaid="{55555555-5555-5555-8555-555555555555}" />';
 assert.throws(()=>H.verifyThumbnailMedia(authored,image,media),/previously blank/);
 assert.throws(()=>H.verifyPrior(before,after),/unverified/);
 const changed=structuredClone(after);changed.fields[0].value='Changed body';assert.throws(()=>H.verifyPrior(before,changed,evidence),/preceding approved/);
});
