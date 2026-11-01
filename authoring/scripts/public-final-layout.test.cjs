'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const model=require('../items/liberty-mutual-public/public-contract.json');
const draftPlan=require('../items/liberty-mutual-public/public-fidelity-draft-plan.json');
const {finalPatch}=require('./public-final-layout.cjs');
const {xmlShape}=require('./configure-product-spotlight.cjs');
const device='fe5d7fdf-89c0-4d99-9aa3-b5fbd009c9f3';
const shared=draftPlan.pages.find(r=>r.path===model.sitePath+'/Home').expectedSharedLayout;
const rows=xmlShape(shared)[3][0][3].map(r=>Object.fromEntries(r[1]));
const base={shared,expectedShared:shared,currentFinal:'',device,plan:{orderedPlacements:[{uid:rows[0].uid,renderingId:rows[0].id,placeholder:rows[0].ph,dataSource:rows[0].ds,parameters:'FieldNames=QuoteIntro&DynamicPlaceholderId=2'},{uid:'11111111-1111-5111-8111-111111111111',renderingId:model.renderingIds.PublicArticle,placeholder:rows[1].ph,dataSource:'page:/Data/Customer reviews',parameters:'FieldNames=TrustStrip&DynamicPlaceholderId=10'}],retainNativeSharedPlacements:rows.slice(2).map(r=>({uid:r.uid,renderingId:r.id,dataSource:r.ds})),retireOnlyOwnedInitialPlacement:rows[1].uid}};
test('versioned fidelity patch keeps shared Promo and Disclosure identities and retires only owned Introduction',()=>{
 const patch=finalPatch(base);assert.equal(patch.retiredUids.length,1);assert.equal(patch.retiredUids[0],rows[1].uid);
 assert.deepEqual(patch.orderedUids.slice(-2),rows.slice(2).map(r=>r.uid));assert(patch.xml.includes('p:delete=""'));assert(patch.xml.includes('p:after="r[@uid='));assert.equal(shared,base.expectedShared);
});
test('author layout edits and existing native personalization are protected',()=>{
 assert.throws(()=>finalPatch({...base,shared:shared.replace('page:/Data/Hero','page:/Data/Another hero')}),/differs/);
 assert.throws(()=>finalPatch({...base,currentFinal:'<r><d id="'+device+'"><r uid="existing-decision" /></d></r>'}),/never replaces/);
 assert.throws(()=>finalPatch({...base,plan:{...base.plan,retainNativeSharedPlacements:base.plan.retainNativeSharedPlacements.slice(1)}}),/Only the explicitly/);
});
