#!/usr/bin/env python3
"""Prepare the expanded public content offline, outside active SCS modules.

Inputs are reviewed editorial JSON and optional native image field bindings.
No login, CMS mutation, active module changes, publication, or deployment occurs.
"""
from pathlib import Path
import argparse, copy, html, importlib.util, json, re, sys
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('public_seed_helpers',Path(__file__).with_name('public-build-model.py'))
h=importlib.util.module_from_spec(spec);spec.loader.exec_module(h)
M=json.loads((h.BASE/'public-contract.json').read_text())
UID,BRACE,F=h.uid,h.brace,h.field
RECORDS=[];MEDIA=[]
def image(value,path,bindings):
    key=value.get('assetKey') if isinstance(value,dict) else None
    if not key:return value if isinstance(value,str) else ''
    result=bindings.get('path:'+path,bindings.get(key,''))
    assert not result or (isinstance(result,str) and re.match(r'<image\s',result,re.I)), 'Image binding must be the actual native Image field XML.'
    MEDIA.append({'path':path,'assetKey':key,'bound':bool(result)})
    return result
def link(value):
    if not value:return ''
    assert isinstance(value,dict) and isinstance(value.get('href'),str)
    href=value['href'];assert (href.startswith('/') and not href.startswith('//')) or href.startswith('https://'),'Unsupported editorial link destination.'
    return h.link(value.get('text',''),href)
def template(name):return M['templateIds'].get(name,UID(h.TP+'/'+name))
def fieldid(template_name,name):return M['fieldIds'].get(template_name+'.'+name,UID('field/'+template_name+'/'+name))
def item(path,parent,template_id,fields=None,shared=None):
    r={'ID':UID(path),'Parent':parent,'Template':template_id,'Path':path}
    if shared:r['SharedFields']=shared
    r['Languages']=[{'Language':'en','Versions':[{'Version':1,'Fields':fields or [F('25bed78c-4957-4165-998a-ca1b52f67497','__Created','20261031T160000Z')]}]}]
    RECORDS.append(r);return r
def data(path,type_name,values):
    return item(path,UID(path.rsplit('/',1)[0]),template(type_name),[F(fieldid(type_name,n),n,v) for n,v in values.items()]+[F(h.F['workflowState'],'__Workflow state',BRACE(M['workflow']['draft']))],[F(h.F['workflow'],'__Workflow',BRACE(M['workflow']['id']))])
def rendering_id(name):return M['renderingIds'].get(name,UID(h.RP+'/'+name))
def variant_id(name,variant):return M['variantIds'].get(name+'.'+variant,UID(h.SITE+'/Presentation/Headless Variants/'+name+'/'+variant))
def placement(page,name,ph,ds,n,variant='Default',identifier=None):
    params='FieldNames='+BRACE(variant_id(name,variant))+'&amp;DynamicPlaceholderId='+str(n)
    if identifier:params+='&amp;RenderingIdentifier='+html.escape(identifier,quote=True)
    return '<r uid="'+BRACE(UID(page+'/rendering/'+name+'/'+str(n)))+'" id="'+BRACE(rendering_id(name))+'" ph="'+ph+'" ds="'+html.escape(ds,quote=True)+'" par="'+params+'" />'
SEARCH_INDEX_ID='f527245d-98c7-4978-8802-237d7717ca43'
SEARCH_INDEX_NAME='Liberty Mutual Approved Answers'
PREVIOUS_SEARCH_INDEX_ID='8c1922a5-85b3-45bc-bbc5-7cbd0d720aba'

def native_search_configuration(configuration):
    # The source's display labels retain camel case, while its actual accepted
    # Search technical field names are lowercase (verified against Push).
    result=copy.deepcopy(configuration)
    if result.get('searchIndex')==PREVIOUS_SEARCH_INDEX_ID:
        result['searchIndex']=SEARCH_INDEX_ID
    keys={'title','summary','body','question','canonicalurl','owner','effectivedate','reviewdate','state','product','audience','sourceurl','nextstepurl','revision'}
    for label,name in result['fieldsMapping'].items():
        assert isinstance(name,str) and name.lower() in keys,'Unknown native Search field: '+str(name)
        result['fieldsMapping'][label]=name.lower()
    return result
def selector_introduction(value):
    # The selector collects a ZIP Code, rather than a separate state field.
    return value.replace('Your state helps keep your next step relevant.',
                         'Your ZIP Code helps keep your next step relevant.')

def quote_hero_summary(value):
    return value.replace('Review your product and state choices before continuing to Liberty Mutual for a quote.',
                         'Review your product and ZIP Code choices before continuing to Liberty Mutual for a quote.')

def prepare(source,bindings):
    assert len(source['pages'])==17 and len(source['answers'])==10,'Expected the agreed focused17-page,10-answer inventory.'
    assert len({p['slug'] for p in source['pages']})==17
    by_slug={a['slug']:a for a in source['answers']}
    root=h.SITE;data_root=root+'/Data';answer_root=data_root+'/Approved answers';options_root=data_root+'/Product options'
    for folder in ['Product options','Search']:item(data_root+'/'+folder,UID(data_root),h.T['folder'])
    for option in source['productOptions']:
        path=options_root+'/'+option['productKey']
        data(path,'PublicProductOption',{'label':option['label'],'productKey':option['productKey'],'image':image(option.get('image'),path,bindings),'quoteLink':link(option['quoteLink'])})
    for answer in source['answers']:
        path=answer_root+'/'+answer['itemName'];assert answer['proposedItemPath']==path
        values={name:answer.get(name,'') for name in ['question','canonicalUrl','answer','formalWording','explanation','owner','effectiveDate','reviewDate','state','product','audience']}
        values.update(sourceLink=link(answer['sourceLink']),nextStep=link(answer['nextStep']),disclosure=BRACE(M['disclosureId']))
        data(path,'PublicApprovedAnswer',values)
    search_config=native_search_configuration(next(p['searchConfiguration'] for p in source['pages'] if p['slug']=='/search'))
    search_path=data_root+'/Search/Consumer knowledge'
    data(search_path,'PublicSearch',{'heading':'Find answers to your insurance questions','introduction':'<p>Explore useful guidance, review its source, and choose your next step.</p>','search':json.dumps(search_config,indent=2)})
    # The source has one intermediate URL folder, not an extra public page.
    route_paths={root+'/Home'+('' if p['slug']=='/' else p['slug']) for p in source['pages']}
    folders=set()
    for path in route_paths:
        parent=path.rsplit('/',1)[0]
        while parent.startswith(root+'/Home/'):
            if parent not in route_paths:folders.add(parent)
            parent=parent.rsplit('/',1)[0]
    for path in sorted(folders,key=len):item(path,UID(path.rsplit('/',1)[0]),h.T['folder'])
    body='/headless-main/sxa-public-page-body/headless-public-content-1';hero='/headless-main/sxa-public-page-body/headless-public-hero-1'
    page_summaries=[]
    for page in source['pages']:
        p=root+'/Home'+('' if page['slug']=='/' else page['slug']);d=p+'/Data'
        hero_summary=quote_hero_summary(page['hero']['summary']) if page['slug']=='/get-a-quote' else page['hero']['summary']
        components=[placement(p,'PublicHero',hero,'page:/Data/Hero',2),placement(p,'PublicArticle',body,'page:/Data/Introduction',3)]
        if page.get('sharedPromotion'):components.append(placement(p,'PublicPromotion',body,BRACE(M['promotionId']),4,'Compact' if page['slug']=='/bundling' else 'Default'))
        if page.get('approvedAnswerSlug'):
            answer=by_slug[page['approvedAnswerSlug']];components.append(placement(p,'PublicApprovedAnswer',body,BRACE(UID(answer_root+'/'+answer['itemName'])),6))
        if page['slug'] in ['/search','/insurance-resources']:components.append(placement(p,'PublicSearch',body,BRACE(UID(search_path)),7))
        if 'productSelectorDefaults' in page or page.get('productSelector'):
            selector=source['componentContracts']['PublicProductSelector'];overrides=page.get('productSelector',{})
            selector_path=d+'/Product choices'
            data(selector_path,'PublicProductSelector',{'heading':selector['heading'],'introduction':selector_introduction(selector['introduction']),'products':'|'.join(BRACE(UID(options_root+'/'+key)) for key in selector['selectorProductKeys']),'defaultProducts':overrides.get('defaultProducts',','.join(page.get('productSelectorDefaults',[]))),'postcodeLabel':selector.get('postcodeLabel','ZIP code'),'actionLink':link(overrides.get('actionLink',selector['actionLink'])),'agentLink':link(selector['agentLink'])})
            components.append(placement(p,'PublicProductSelector',body,'page:/Data/Product choices',8,identifier=overrides.get('RenderingIdentifier')))
        if page.get('quoteHandoff'):
            q=page['quoteHandoff'];handoff_path=d+'/Next step';agent=q.get('agentLink',{'href':'/contact-an-agent','text':'Find an independent agent'})
            data(handoff_path,'PublicQuoteHandoff',{'heading':'Find an independent agent' if q.get('variant')=='Agent' else 'Continue with Liberty Mutual','introduction':page['introduction']['body'],'products':'|'.join(BRACE(UID(options_root+'/'+key)) for key in source['componentContracts']['PublicQuoteHandoff']['quoteProductKeys']),'agentLink':link(agent)})
            components.append(placement(p,'PublicQuoteHandoff',body,'page:/Data/Next step',9,q.get('variant','Default'),q.get('RenderingIdentifier')))
        components.append(placement(p,'SharedDisclosure',body,BRACE(M['disclosureId']),5))
        values=[F('d3bed2bd-a5f0-49ab-b7a5-6b72b0f34e4b','Title',page['title']),F('4e0720e9-9d50-4ddc-87cf-ecd65e8e94c8','NavigationTitle',page['title']),F(h.F['workflowState'],'__Workflow state',BRACE(M['workflow']['draft']))]
        meta={'metadataTitle':page['title'],'metadataDescription':hero_summary.replace('<p>','').replace('</p>',''),'canonicalUrl':page['canonicalUrl'],'audience':page.get('audience','consumer'),'state':page.get('state','All'),'product':page.get('product','')}
        values.extend(F(fieldid('PublicPage',k),k,v) for k,v in meta.items())
        item(p,UID(p.rsplit('/',1)[0]),template('PublicPage'),values,[F(h.F['layout'],'__Renderings',h.layout(components)),F(h.F['workflow'],'__Workflow',BRACE(M['workflow']['id']))])
        item(d,UID(p),h.T['data'])
        hero_values={**page['hero'],'summary':hero_summary,'image':image(page['hero'].get('image'),d+'/Hero',bindings),'primaryLink':link(page['hero'].get('primaryLink')),'secondaryLink':link(page['hero'].get('secondaryLink'))}
        data(d+'/Hero','PublicHero',hero_values);data(d+'/Introduction','PublicArticle',page['introduction'])
        page_summaries.append({'route':page['slug'],'id':UID(p),'path':p,'components':[name for name in ['PublicHero','PublicArticle','PublicPromotion','PublicApprovedAnswer','PublicSearch','PublicProductSelector','PublicQuoteHandoff','SharedDisclosure'] if any(BRACE(rendering_id(name)) in c for c in components)]})
    assert len(page_summaries)==17 and len({r['ID'] for r in RECORDS})==len(RECORDS)
    new_contracts={
      'PublicSearch':{'fields':{'heading':'Single-Line Text','introduction':'Rich Text','search':'Multi-Line Text'},'source':data_root+'/Search'},
      'PublicProductOption':{'fields':{'label':'Single-Line Text','productKey':'Single-Line Text','image':'Image','quoteLink':'General Link'},'source':options_root},
      'PublicProductSelector':{'fields':{'heading':'Single-Line Text','introduction':'Rich Text','products':'Multilist','defaultProducts':'Single-Line Text','actionLink':'General Link','agentLink':'General Link'},'source':'query:./Data'},
      'PublicQuoteHandoff':{'fields':{'heading':'Single-Line Text','introduction':'Rich Text','products':'Multilist','agentLink':'General Link'},'source':'query:./Data','variants':['Default','Agent']},
    }
    return {'schemaVersion':1,'state':'prepared only; not installed or published','sitePath':root,'workflow':M['workflow'],'pages':page_summaries,'answerIds':{a['slug']:UID(answer_root+'/'+a['itemName']) for a in source['answers']},'requiredModels':{name:{**contract,'templateId':template(name),'renderingId':rendering_id(name) if name!='PublicProductOption' else None,'fieldIds':{k:fieldid(name,k) for k in contract['fields']}} for name,contract in new_contracts.items()},'mediaBindings':MEDIA,'records':RECORDS,'existingEditorialUpdateProposals':[
      {'path':root+'/Presentation/Partial Designs/Header/Data/Header','field':'homeInsuranceLink','value':link({'href':'https://www.libertymutual.com/property/homeowners-insurance','text':'Home insurance'}),'reason':'No local homeowners page is included in the focused17-page scope.'},
      {'id':M['promotionId'],'fields':{k:(link(v) if k=='actionLink' else image(v,data_root+'/Promotions/Bundle and save',bindings) if k=='image' else BRACE(v) if k=='disclosure' else v) for k,v in source['sharedPromotionDraft'].items() if k in ['eyebrow','headline','body','actionLink','image','disclosure']},'reason':'Optional reviewed copy refresh of the existing reusable Promotion; preserve its identity and both placements.'}
    ]}
def main():
    p=argparse.ArgumentParser();p.add_argument('--input',required=True,type=Path);p.add_argument('--output',required=True,type=Path);p.add_argument('--media-bindings',type=Path);a=p.parse_args()
    assert a.input.is_absolute() and a.output.is_absolute() and not a.output.is_relative_to(ROOT),'Keep prepared output outside active repository modules.'
    assert not a.output.exists(),'Use a new prepared output directory.'
    source=json.loads(a.input.read_text());bindings=json.loads(a.media_bindings.read_text()) if a.media_bindings else {}
    result=prepare(source,bindings);a.output.mkdir(parents=True,mode=0o700)
    (a.output/'prepared-seed.json').write_text(json.dumps(result,indent=2)+'\n')
    for r in result['records']:
        relative=r['Path'][len(h.SITE):].lstrip('/');file=a.output/'items'/(relative.replace('$','#')+'.yml');file.parent.mkdir(parents=True,exist_ok=True);file.write_text(h.serialize(r))
    print(json.dumps({'state':'offline prepared only','pages':len(result['pages']),'approvedAnswerDrafts':len(result['answerIds']),'nativeRecords':len(result['records']),'newModelPrerequisites':list(result['requiredModels']),'unboundMedia':sum(not a['bound'] for a in result['mediaBindings'])},indent=2))
if __name__=='__main__':main()
