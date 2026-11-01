'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {assertNewBusinessCopy}=require('./public-create-logo-drafts.cjs');
const f=(name,value,n)=>({fieldId:String(n).padStart(32,'0'),name,value});
const source={fields:[f('logo','old',1),f('__Workflow state','approved',2),f('__Valid from','',3),f('__Created','20261031T020000Z',4),f('body','Keep this exact content.',5)]};
function created(valid='20261101T032218Z'){
 const v=structuredClone(source);v.fields.find(f=>f.name==='logo').value='new';v.fields.find(f=>f.name==='__Workflow state').value='draft';v.fields.find(f=>f.name==='__Created').value='20261101T032218Z';v.fields.find(f=>f.name==='__Valid from').value=valid;return v;
}
test('allows only native valid-from initialization equal to the new Created timestamp',()=>{
 assert.doesNotThrow(()=>assertNewBusinessCopy(source,created(),{logo:'new','__Workflow state':'draft'}));
 assert.throws(()=>assertNewBusinessCopy(source,created('20270101T000000Z'),{logo:'new','__Workflow state':'draft'}));
});
test('does not ignore source publication restrictions or unrelated business edits',()=>{
 const restricted=structuredClone(source);restricted.fields.find(f=>f.name==='__Valid from').value='20261030T000000Z';
 assert.throws(()=>assertNewBusinessCopy(restricted,created(),{logo:'new','__Workflow state':'draft'}));
 const changed=created();changed.fields.find(f=>f.name==='body').value='Unreviewed replacement.';
 assert.throws(()=>assertNewBusinessCopy(source,changed,{logo:'new','__Workflow state':'draft'}));
});
test('allows only an automatically initialized prior validity date to advance with native AddVersion',()=>{
 const prior=structuredClone(source);prior.fields.find(f=>f.name==='__Valid from').value=prior.fields.find(f=>f.name==='__Created').value;
 assert.doesNotThrow(()=>assertNewBusinessCopy(prior,created(),{logo:'new','__Workflow state':'draft'}));
 const future=structuredClone(prior);future.fields.find(f=>f.name==='__Valid from').value='20270101T000000Z';
 assert.throws(()=>assertNewBusinessCopy(future,created(),{logo:'new','__Workflow state':'draft'}));
});
