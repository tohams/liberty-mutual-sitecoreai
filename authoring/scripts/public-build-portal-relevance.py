#!/usr/bin/env python3
"""Offline native agency-priority editorial seed and narrow presentation model.
No CMS operations; all editorial items are explicit CreateOnly, initially Draft.
"""
from pathlib import Path
import argparse, importlib.util, json, sys
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('public_model_helpers',Path(__file__).with_name('public-build-model.py'))
h=importlib.util.module_from_spec(spec);spec.loader.exec_module(h)
BASE=h.BASE; PORTAL=h.PORTAL; LIBRARY=PORTAL+'/Data/Agency priorities'
M=json.loads((BASE/'public-contract.json').read_text())
uid,brace,field=h.uid,h.brace,h.field
DATA_PARENT='20e904a1-9b60-43a1-a8d0-8e3aee45b115'
VARIANTS_PARENT='19a63bdd-f9c6-403b-8068-c1884e9bb413'
PLACEHOLDERS_PARENT='e601261f-f47f-4831-b91e-ef70efab3276'
AVAILABLE_PARENT='2bcfce89-293c-4ddb-870a-78bce4777859'
RECORDS=[]
def item(path,parent,template,fields=None,shared=None):
    r={'ID':uid(path),'Parent':parent,'Template':template,'Path':path}
    if shared:r['SharedFields']=shared
    r['Languages']=[{'Language':'en','Versions':[{'Version':1,'Fields':fields or [field('25bed78c-4957-4165-998a-ca1b52f67497','__Created','20261031T160000Z')]}]}]
    RECORDS.append(r);return r
def data(path,template,values):
    r=item(path,uid(path.rsplit('/',1)[0]),M['templateIds'][template],[field(M['fieldIds'][template+'.'+name],name,value) for name,value in values.items()]+[field(h.F['workflowState'],'__Workflow state',brace(M['workflow']['draft']))],[field(h.F['workflow'],'__Workflow',brace(M['workflow']['id']))]);return r
def build():
    item(LIBRARY,DATA_PARENT,h.T['folder'],shared=[field(h.F['masters'],'__Masters',brace(M['templateIds']['AgencyPriorities']))])
    item(LIBRARY+'/Recommendations',uid(LIBRARY),h.T['folder'],shared=[field(h.F['masters'],'__Masters',brace(M['templateIds']['AgencyPriority']))])
    cards=[
      ('Home and auto conversations','HOUSEHOLD GROWTH','Connect home and auto conversations','<p>Help clients consider their home and auto needs together, and prepare for a useful renewal conversation.</p>','Review the household guide','/resources/prepare-a-household-renewal'),
      ('Small business growth','SMALL BUSINESS','Build a stronger small-business practice','<p>Bring approved product guidance and preparation resources into your team’s small-business conversations.</p>','Explore the growth guide','/resources/expand-small-business-practice'),
      ('Texas workers compensation','TEXAS GUIDANCE','Support workers’ compensation conversations in Texas','<p>Use the Texas preparation guide to organize the questions and information needed for your next client conversation.</p>','Read Texas guidance','/resources/texas-workers-compensation'),
      ('Illinois workers compensation','ILLINOIS GUIDANCE','Support workers’ compensation conversations in Illinois','<p>Find state-specific preparation guidance for the Illinois employers with whom you work.</p>','Read Illinois guidance','/resources/illinois-workers-compensation'),
    ]
    for name,eyebrow,heading,body,label,url in cards:data(LIBRARY+'/Recommendations/'+name,'AgencyPriority',{'Eyebrow':eyebrow,'Heading':heading,'Body':body,'Image':'','Link':h.link(label,url)})
    ordered={
      'For all agencies':['Home and auto conversations','Small business growth'],
      'Agency growth priorities':['Small business growth','Texas workers compensation','Home and auto conversations'],
      'Producer priorities':['Home and auto conversations','Illinois workers compensation','Small business growth'],
    }
    intros={
      'For all agencies':'<p>Explore product conversations and resources that help your agency grow.</p>',
      'Agency growth priorities':'<p>Help your team develop its small-business opportunities and strengthen relevant client conversations.</p>',
      'Producer priorities':'<p>Connect your clients with useful product guidance and resources for your next conversation.</p>',
    }
    for name,names in ordered.items():data(LIBRARY+'/'+name,'AgencyPriorities',{'Heading':'Priorities for your agency','Intro':intros[name],'Recommendations':'|'.join(brace(uid(LIBRARY+'/Recommendations/'+n)) for n in names)})
    seed=list(RECORDS); RECORDS.clear()
    for key,component,section in [('headless-agency-priorities','AgencyPriorities','Business priorities'),('headless-shared-disclosure','SharedDisclosure','Shared content')]:
        item(PORTAL+'/Presentation/Placeholder Settings/'+key,PLACEHOLDERS_PARENT,h.T['sitePlaceholder'],shared=[field('7256bdab-1fd2-49dd-b205-cb4873d2917c','Placeholder Key',key),field('e391b526-d0c5-439d-803e-17512eae6222','Allowed Controls',brace(M['renderingIds'][component]))])
        item(PORTAL+'/Presentation/Available Renderings/'+section,AVAILABLE_PARENT,h.T['available'],shared=[field('715ae6c0-71c8-4744-ab4f-65362d20ad65','Renderings',brace(M['renderingIds'][component]))])
        vp=PORTAL+'/Presentation/Headless Variants/'+component
        item(vp,VARIANTS_PARENT,h.T['variantFolder'])
        item(vp+'/Default',uid(vp),h.T['variant'])
    presentation=list(RECORDS);out={}
    def include(name,path,scope=None,operation='CreateAndUpdate'):
        x={'name':name,'path':path,'allowedPushOperations':operation}
        if scope:x['scope']=scope
        return x
    pi=[]
    for r in presentation:
        name='portal-relevance-'+r['Path'].replace(PORTAL+'/Presentation/','').replace('/','-').replace(' ','-').lower()
        pi.append(include(name,r['Path'],'SingleItem'))
        out[BASE/'items'/name/(r['Path'].rsplit('/',1)[-1]+'.yml')]=h.serialize(r)
    for r in seed:
        rel=r['Path'][len(LIBRARY):].lstrip('/')
        out[BASE/'items/portal-relevance-seed'/('Agency priorities'+('/'+rel if rel else '')+'.yml')]=h.serialize(r)
    for namespace,includes in [('LibertyMutual.PortalRelevancePresentation',pi),('LibertyMutual.PortalRelevanceSeed',[include('portal-relevance-seed',LIBRARY,operation='CreateOnly')])]:
        out[BASE/(namespace+'.module.json')]=json.dumps({'$schema':'../../../.sitecore/schemas/ModuleFile.schema.json','namespace':namespace,'description':'Portal RFP relevance '+('editable editorial CreateOnly seed; excluded from ordinary Deploy' if namespace.endswith('Seed') else 'exact developer-owned site placeholder, palette, and variant definitions'),'items':{'includes':includes}},indent=2)+'\n'
    manifest={'schemaVersion':1,'portalPath':PORTAL,'libraryPath':LIBRARY,'workflow':M['workflow'],'datasources':{key:{'id':uid(LIBRARY+'/'+name),'path':LIBRARY+'/'+name} for key,name in [('neutral','For all agencies'),('principal','Agency growth priorities'),('producer','Producer priorities')]},'recommendations':{r['Path'].rsplit('/',1)[-1]:r['ID'] for r in seed if r['Template']==M['templateIds']['AgencyPriority']},'renderings':{name:{'id':M['renderingIds'][name],'variantId':uid(PORTAL+'/Presentation/Headless Variants/'+name+'/Default')} for name in ['AgencyPriorities','SharedDisclosure']},'sharedDisclosureId':M['disclosureId'],'placeholderIds':{name:{'global':uid(h.PP+'/'+name),'site':uid(PORTAL+'/Presentation/Placeholder Settings/'+name)} for name in ['headless-agency-priorities','headless-shared-disclosure']},'instances':{'homePriorities':uid(PORTAL+'/Home/rfp/AgencyPriorities'),'homeDisclosure':uid(PORTAL+'/Home/rfp/SharedDisclosure'),'resourcesDisclosure':uid(PORTAL+'/Home/resources/rfp/SharedDisclosure')},'records':seed+presentation}
    out[BASE/'portal-relevance-contract.json']=json.dumps(manifest,indent=2)+'\n';return out
def main():
    p=argparse.ArgumentParser();p.add_argument('--check',action='store_true');a=p.parse_args();out=build()
    if a.check:
        drift=[str(p.relative_to(ROOT)) for p,v in out.items() if not p.exists() or p.read_text()!=v]
        if drift:raise SystemExit('Portal relevance source drift: '+', '.join(drift[:8]))
        print(f'Checked {len(out)} portal relevance files; no writes.')
    else:
        for p,v in out.items():p.parent.mkdir(parents=True,exist_ok=True);p.write_text(v)
        print(f'Prepared {len(out)} portal relevance files. No CMS operations.')
if __name__=='__main__':main()
