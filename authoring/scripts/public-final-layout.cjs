'use strict';
/** Pure, bounded native Final Renderings patch preparation. No CMS writes.
 * Existing shared layout must equal its recorded developer-owned initial
 * composition; any existing final-layout decisions stop the operation.
 */
const assert=require('node:assert/strict');
const {xmlShape}=require('./configure-product-spotlight.cjs');
const {norm}=require('./public-native-state.cjs');
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
const braces=value=>'{'+String(value).replace(/[{}]/g,'').toUpperCase()+'}';
function sharedRenderings(xml,expected,device){
 const actual=xmlShape(xml),wanted=xmlShape(expected);
 assert.deepEqual(actual,wanted,'Shared composition differs from its recorded first slice; preserve the author change.');
 assert(actual?.[3].length===1,'Expected one recorded public page device.');
 const d=actual[3][0];assert(d[0]==='d'&&norm(new Map(d[1]).get('id'))===norm(device),'Unexpected native device.');
 const result=new Map();for(const r of d[3]){
  assert(r[0]==='r'&&!r[3].length,'Unexpected nested native decision; preserve it.');
  const attrs=Object.fromEntries(r[1]);assert(attrs.uid&&attrs.id&&attrs.ph,'Incomplete recorded rendering.');
  const key=norm(attrs.uid);assert(!result.has(key),'Duplicate rendering identity.');result.set(key,attrs);
 }
 return result;
}
function finalPatch({shared,expectedShared,currentFinal,plan,device,variants}){
 const existing=sharedRenderings(shared,expectedShared,device);
 const old=currentFinal?.trim()?xmlShape(currentFinal):null;
 assert(!old||!old[3].length,'Existing Final Renderings must be explicitly reconciled; this helper never replaces native personalization or tests.');
 const ordered=plan.orderedPlacements.map(p=>({...p}));
 for(const retain of plan.retainNativeSharedPlacements){
  const source=existing.get(norm(retain.uid));assert(source&&norm(source.id)===norm(retain.renderingId)&&norm(source.ds)===norm(retain.dataSource),'Retained native shared placement changed.');
  ordered.push({uid:source.uid,renderingId:source.id,placeholder:source.ph,dataSource:source.ds,parameters:source.par||''});
 }
 assert(new Set(ordered.map(p=>norm(p.uid))).size===ordered.length,'Duplicate desired rendering UID.');
 const wanted=new Set(ordered.map(p=>norm(p.uid)));
 const deleted=[...existing].filter(([uid])=>!wanted.has(uid));
 assert(deleted.length===1&&deleted[0][0]===norm(plan.retireOnlyOwnedInitialPlacement),'Only the explicitly recorded first-slice Introduction can be retired.');
 let body=deleted.map(([,r])=>'<r uid="'+escape(r.uid)+'" p:delete="" />').join('');
 let previous;
 for(const p of ordered){
  assert(p.placeholder&&p.renderingId&&p.dataSource!==undefined&&p.parameters!==undefined,'Incomplete desired native placement.');
  const position=previous?'p:after="r[@uid=\''+braces(previous)+'\']"':'p:before="*"';
  body+='<r uid="'+braces(p.uid)+'" '+position+' s:id="'+braces(p.renderingId)+'" s:ph="'+escape(p.placeholder)+'" s:ds="'+escape(p.dataSource)+'" s:par="'+escape(p.parameters)+'" />';previous=p.uid;
 }
 const result='<r xmlns:p="p" xmlns:s="s" p:p="1"><d id="'+braces(device)+'">'+body+'</d></r>';
 xmlShape(result);
 return {xml:result,retiredUids:deleted.map(([,r])=>r.uid),orderedUids:ordered.map(p=>braces(p.uid))};
}
module.exports={finalPatch,sharedRenderings};
