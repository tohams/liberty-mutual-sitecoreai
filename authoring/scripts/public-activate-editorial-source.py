#!/usr/bin/env python3
"""Build the agreed factory seed and separate reviewed-content change plan.

Source files only. No authentication, CMS writes, approval, or publication.
Normal Deploy excludes every editorial seed module.
"""
from pathlib import Path
import argparse, copy, importlib.util, json, re, sys
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[2];BASE=ROOT/'authoring/items/liberty-mutual-public'
def module(name,file):
    s=importlib.util.spec_from_file_location(name,Path(__file__).with_name(file));m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
def merge_record(old,new):
    assert all(old[k]==new[k] for k in ['ID','Parent','Template','Path']),'Seed identity changed: '+new['Path']
    result=copy.deepcopy(old)
    def fields(a,b):
        by={f['ID'].lower():f for f in a};by.update({f['ID'].lower():f for f in b});return list(by.values())
    result['SharedFields']=fields(old.get('SharedFields',[]),new.get('SharedFields',[]))
    assert len(old['Languages'])==len(new['Languages'])==1 and old['Languages'][0]['Language']==new['Languages'][0]['Language']=='en'
    a,b=result['Languages'][0],new['Languages'][0];a['Fields']=fields(a.get('Fields',[]),b.get('Fields',[]))
    assert len(a['Versions'])==len(b['Versions'])==1 and a['Versions'][0]['Version']==b['Versions'][0]['Version']==1
    a['Versions'][0]['Fields']=fields(a['Versions'][0].get('Fields',[]),b['Versions'][0].get('Fields',[]))
    return result
def main():
    p=argparse.ArgumentParser();p.add_argument('--editorial',type=Path,required=True);p.add_argument('--composition',type=Path,required=True);p.add_argument('--media-bindings',type=Path,required=True);a=p.parse_args()
    assert all(f.is_absolute() for f in vars(a).values())
    raw=json.loads(a.media_bindings.read_text());raw=raw.get('bindings',raw)
    bindings={key:value['imageField'] if isinstance(value,dict) else value for key,value in raw.items()}
    for key,value in bindings.items():assert isinstance(value,str) and re.match(r'<image\s',value,re.I) and ('mediaid=' in value.lower() or 'dam-id=' in value.lower()),'Actual native image binding required: '+key
    generic=module('activate_generic','public-prepare-editorial-seed.py');generic.RECORDS.clear();generic.MEDIA.clear()
    seed=generic.prepare(json.loads(a.editorial.read_text()),bindings)
    fidelity=module('activate_fidelity','public-prepare-fidelity.py');fidelity.phase.records()
    preparation=fidelity.Preparation(bindings);plan=preparation.prepare(json.loads(a.composition.read_text()));h=fidelity.h
    assert all(x['bound'] for x in [*seed['mediaBindings'],*plan['mediaBindings']]),'Do not activate source with unbound images.'
    prior=BASE/'public-fidelity-draft-plan.json'
    previous=json.loads(prior.read_text()) if prior.exists() else None
    for page in plan['pages']:
        if page['route'] in ['/','/bundling']:
            page['expectedSharedLayout']=next(p['expectedSharedLayout'] for p in previous['pages'] if p['route']==page['route']) if previous else next(r['fields']['__Renderings'] for r in fidelity.M['records'] if r['path']==page['path'])
    h.RECORDS.clear();h.build(include_editorial=False)
    by={r['Path']:copy.deepcopy(r) for bucket,r in h.RECORDS if bucket in ['content','partial-content']}
    for r in [*seed['records'],*preparation.records]:by[r['Path']]=merge_record(by[r['Path']],r) if r['Path'] in by else r
    for change in plan['newDraftChanges']:
        r=by[change['path']];fields=r['Languages'][0]['Versions'][0]['Fields'];type_name=next(name for name,id in h.TEMPLATES.items() if id==r['Template'])
        r['Languages'][0]['Versions'][0]['Fields']=h.merge_fields(fields,[h.field(h.FIELDS[type_name+'.'+key],key,value) for key,value in change['fields'].items()])
    # Source composition is for a brand-new factory seed only. Existing pages
    # receive the separate guarded new-Draft Final Renderings plan, never a
    # shared-layout overwrite.
    for page in plan['pages']:
        rows=copy.deepcopy(page['orderedPlacements'])
        for kept in page['retainNativeSharedPlacements']:
            n=4 if kept['componentName']=='PublicPromotion' else 5
            rows.append({**kept,'placeholder':'/headless-main/sxa-public-page-body/headless-public-content-1','parameters':'FieldNames='+h.brace(h.uid(h.SITE+'/Presentation/Headless Variants/'+kept['componentName']+'/'+kept['variant']))+'&DynamicPlaceholderId='+str(n)})
        xml=[]
        for r in rows:xml.append('<r uid="'+h.brace(r['uid'])+'" id="'+h.brace(r['renderingId'])+'" ph="'+fidelity.html.escape(r['placeholder'],quote=True)+'" ds="'+fidelity.html.escape(r['dataSource'],quote=True)+'" par="'+fidelity.html.escape(r['parameters'],quote=True)+'" />')
        target=by[page['path']];target['SharedFields']=h.merge_fields(target.get('SharedFields',[]),[h.field(h.F['layout'],'__Renderings',h.layout(xml))])
    # Keep the compatibility Header field navigable too; current navigation
    # uses native ordered groups, while this remains an editable native link.
    for change in seed['existingEditorialUpdateProposals']:
        if 'field' in change:
            r=by[change['path']];r['Languages'][0]['Versions'][0]['Fields']=h.merge_fields(r['Languages'][0]['Versions'][0]['Fields'],[h.field(h.FIELDS['PublicHeader.'+change['field']],change['field'],change['value'])])
    records=sorted(by.values(),key=lambda r:(len(r['Path'].split('/')),r['Path']))
    assert len({r['ID'] for r in records})==len(records)
    # These are authored-value snapshots, not a second runtime content store.
    result={'schemaVersion':1,'ownership':'One-time CreateOnly factory editorial seed; excluded from normal Deploy.','routeCount':len(seed['pages']),'answerCount':len(seed['answerIds']),'records':records}
    (BASE/'public-editorial-records.json').write_text(json.dumps(result,indent=2)+'\n')
    (BASE/'public-fidelity-draft-plan.json').write_text(json.dumps(plan,indent=2)+'\n')
    (BASE/'public-media-bindings.json').write_text(json.dumps({'schemaVersion':1,'bindings':bindings},indent=2)+'\n')
    print(json.dumps({'sourceOnly':True,'factoryRecords':len(records),'routes':len(seed['pages']),'answerDrafts':len(seed['answerIds']),'fidelityCreateOnlyRecords':len(preparation.records),'reviewedContentNewDrafts':len(plan['newDraftChanges']),'allImageBindingsNative':True}))
if __name__=='__main__':main()
