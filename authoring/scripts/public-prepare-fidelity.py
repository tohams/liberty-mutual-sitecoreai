#!/usr/bin/env python3
"""Prepare native fidelity definitions and page-local content offline.

Existing approved content is represented only as a new-Draft change proposal.
This program does not log in, activate modules, upload, approve, or publish.
"""
from pathlib import Path
import argparse, html, importlib.util, json, re, sys
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[2]
def load_module(name,file):
    s=importlib.util.spec_from_file_location(name,Path(__file__).with_name(file));m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
phase=load_module('fidelity_prerequisites','public-prepare-phase-two.py')
h=phase.h;M=phase.M

PRODUCT_KEYS=('auto','home','condo','renters','pet','motorcycle','life','small-business')
def product_keys(value):
    if isinstance(value,dict):
        assert set(value)=={'productKeys'},'Only the declared productKeys reference list is supported.'
        value=value['productKeys']
    assert isinstance(value,list) and value,'Ordered products must be a non-empty list.'
    assert all(isinstance(key,str) and key in PRODUCT_KEYS for key in value),'Unknown product-option reference.'
    assert len(value)==len(set(value)),'Duplicate product-option reference.'
    return value

class Preparation:
    def __init__(self,bindings):
        self.bindings=bindings;self.records=[];self.changes=[];self.media=[]
    def folder(self,path):
        if any(r['Path']==path for r in self.records):return
        self.records.append({'ID':h.uid(path),'Parent':h.uid(path.rsplit('/',1)[0]),'Template':h.T['folder'],'Path':path,'Languages':[{'Language':'en','Versions':[{'Version':1,'Fields':[h.field('25bed78c-4957-4165-998a-ca1b52f67497','__Created','20261031T160000Z')]}]}]})
    def data(self,path,name,fields):
        self.records.append({'ID':h.uid(path),'Parent':h.uid(path.rsplit('/',1)[0]),'Template':h.TEMPLATES[name],'Path':path,'SharedFields':[h.field(h.F['workflow'],'__Workflow',h.brace(M['workflow']['id']))],'Languages':[{'Language':'en','Versions':[{'Version':1,'Fields':[h.field(h.FIELDS[name+'.'+key],key,value) for key,value in fields.items()]+[h.field(h.F['workflowState'],'__Workflow state',h.brace(M['workflow']['draft']))]}]}]})
    def link(self,value):
        if not value or not value.get('href'):return ''
        href=value['href']
        assert href.startswith(('https://','/','#','tel:','mailto:')) and not href.startswith('//'),'Unsupported link.'
        return h.link(value.get('text',''),href)
    def image(self,value,path):
        if not value:return ''
        key=value['assetKey'];result=self.bindings.get('path:'+path,self.bindings.get(key,''))
        assert not result or ('mediaid=' in result.lower() or 'dam-id=' in result.lower()),'Require a real native media binding.'
        self.media.append({'path':path,'assetKey':key,'bound':bool(result)})
        return result
    def nested(self,parent,folder,name,values):
        path=parent+'/'+folder;self.folder(path);selected=[]
        for number,child in enumerate(values,1):
            label=child.get('heading') or child.get('question') or child.get('label') or child.get('link',{}).get('text') or str(number)
            label=re.sub(r'<[^>]*>','',label)
            label=re.sub(r'[^\w\s-]','',html.unescape(label)).strip()[:45 if name=='PublicFaqItem' else 65]
            item_path=path+'/'+f'{number:02} '+label
            fields=self.fields(name,child,item_path);self.data(item_path,name,fields);selected.append(h.brace(h.uid(item_path)))
        return '|'.join(selected)
    def fields(self,name,values,path):
        refs={
          ('PublicSection','items'):('Cards','PublicCard'),('PublicFaq','items'):('Questions','PublicFaqItem'),
          ('PublicBreadcrumbs','items'):('Links','PublicLink'),('PublicNavigationGroup','links'):('Links','PublicLink'),
          ('PublicFooterColumn','links'):('Links','PublicLink'),('PublicHeader','navigation'):('Navigation','PublicNavigationGroup'),
          ('PublicFooter','columns'):('Columns','PublicFooterColumn'),('PublicFooter','socialLinks'):('Social','PublicLink'),('PublicFooter','legalLinks'):('Legal','PublicLink')}
        out={}
        for key,value in values.items():
            assert name+'.'+key in h.FIELDS,'Unmodeled field: '+name+'.'+key
            if (name,key) in refs:
                folder,target=refs[name,key];out[key]=self.nested(path,folder,target,value)
            elif key in ['image','logo','mobileLogo']:out[key]=self.image(value,path+'/'+key)
            elif key.endswith('Link') or key in ['link']:out[key]=self.link(value)
            elif name=='PublicProductSelector' and key=='products':out[key]='|'.join(h.brace(h.uid(h.SITE+'/Data/Product options/'+v)) for v in product_keys(value))
            else:assert isinstance(value,str),(name,key);out[key]=value
        return out
    def placement(self,page,component,number,fields_path):
        name=component['component'];variant=component['variant'];hero=component['placeholder']=='hero'
        instance=h.uid(page+'/rendering/PublicHero/2') if name=='PublicHero' else h.uid(page+'/rendering/fidelity/'+component['key'])
        params='FieldNames='+h.brace(h.uid(h.SITE+'/Presentation/Headless Variants/'+name+'/'+variant))+'&DynamicPlaceholderId='+str(number)
        if component.get('styles'):params+='&Styles='+component['styles']
        return {'uid':instance,'renderingId':h.RENDERINGS[name],'componentName':name,'placeholder':'/headless-main/sxa-public-page-body/headless-public-'+('hero' if hero else 'content')+'-1','dataSource':'page:'+fields_path[len(page):],'parameters':params,'variant':variant}
    def prepare(self,source):
        options=h.SITE+'/Data/Product options';self.folder(options)
        labels={'auto':'Auto','home':'Home','condo':'Condo','renters':'Renters','pet':'Pet','motorcycle':'Motorcycle','life':'Life','small-business':'Small Business'}
        for key in source['productOptions']['orderedKeys']:
            path=options+'/'+key
            self.data(path,'PublicProductOption',{'label':labels[key],'productKey':key,'image':self.image({'assetKey':'product-'+key},path),'quoteLink':self.link(source['productOptions']['destination'])})
        pages=[]
        for page in source['pages']:
            path=h.SITE+'/Home'+('' if page['route']=='/' else page['route']);ordered=[]
            for number,component in enumerate(page['components'],10):
                name=component['component'];key=component['key']
                readable={'home-quote':'Quote choices','home-trust':'Customer reviews','home-proof':'Protection and savings','home-emu':'Limu Emu and Doug','home-products':'Insurance options','home-claims':'Claims support','home-quote-choices':'Ways to get a quote','home-manage':'Manage your policy','home-bill':'Pay your bill','home-savings-footnote':'Savings disclosure','bundling-breadcrumbs':'Breadcrumbs','bundling-hero-photo':'Family basketball','bundling-intro':'Bundle overview','bundling-types':'Bundle choices','bundling-savings':'How bundling works','bundling-why':'Why bundle','bundling-confidence':'Bundle confidence','bundling-faq':'Frequently asked questions','bundling-bottom-quote':'Ready for a quote','product-savings-footnote':'Savings disclosure','auto-breadcrumbs':'Breadcrumbs','auto-quote':'Quote choices','auto-hero-photo':'Family car','auto-intro':'Coverage overview','auto-discounts':'Available discounts','auto-learning':'Insurance guidance','auto-confidence':'Coverage confidence','auto-faq':'Frequently asked questions','auto-bottom-quote':'Ready for a quote','bundling-quote':'Quote choices'}
                local=path+'/Data/'+('Hero' if name=='PublicHero' else 'FAQs' if name=='PublicFaq' else readable.get(key,key.replace('-',' ').capitalize()))
                fields=self.fields(name,component['fields'],local)
                if name=='PublicHero' and page['route'] in ['/','/bundling']:
                    self.changes.append({'id':h.uid(local),'path':local,'fields':fields,'mode':'new Draft from latest approved version','preserveFields':['image','heading','eyebrow','primaryLink','secondaryLink']})
                else:self.data(local,name,fields)
                ordered.append(self.placement(path,component,number,local))
            # Existing reusable-content placements are retained separately from
            # source savings footnotes; the public-owned disclosure remains the
            # very same native item consumed by the Portal.
            retained=[{'uid':h.uid(path+'/rendering/SharedDisclosure/5'),'renderingId':M['renderingIds']['SharedDisclosure'],'componentName':'SharedDisclosure','dataSource':h.brace(M['disclosureId']),'variant':'Default'}]
            if page['route'] in ['/','/bundling']:
                retained.insert(0,{'uid':h.uid(path+'/rendering/PublicPromotion/4'),'renderingId':M['renderingIds']['PublicPromotion'],'componentName':'PublicPromotion','dataSource':h.brace(M['promotionId']),'variant':'Compact' if page['route']=='/bundling' else 'Default'})
            pages.append({'id':h.uid(path),'path':path,'route':page['route'],'layoutChange':'versioned Final Renderings in a new Draft; preserve existing Shared Renderings and historical approved versions','orderedPlacements':ordered,'retainNativeSharedPlacements':retained,'retireOnlyOwnedInitialPlacement':h.uid(path+'/rendering/PublicArticle/3')})
        for name,key in [('PublicHeader','header'),('PublicFooter','footer')]:
            label=name[6:];path=h.SITE+'/Presentation/Partial Designs/'+label+'/Data/'+label
            values={**source[key],'logo':{'assetKey':'logo-header' if name=='PublicHeader' else 'logo-footer-vertical'}}
            if name=='PublicFooter':values['mobileLogo']={'assetKey':'logo-footer-medallion'}
            fields=self.fields(name,values,path)
            self.changes.append({'id':h.uid(path),'path':path,'fields':fields,'mode':'new Draft from latest approved version','preserveHistory':'All preceding approved versions, including their initial logo, remain unchanged.'})
        assert len({r['ID'] for r in self.records})==len(self.records),'Duplicate native item identity.'
        return {'schemaVersion':1,'status':'Prepared offline only; not activated or published.','sitePath':h.SITE,'workflow':M['workflow'],'pages':pages,'createOnlyEditorialRecords':self.records,'newDraftChanges':self.changes,'mediaBindings':self.media,'publicationGate':'Every delivered datasource, nested selected record, shared Promotion, and Disclosure must pass native review and publication; Preview content is not approved delivery.'}

def main():
    p=argparse.ArgumentParser();p.add_argument('--composition',type=Path,required=True);p.add_argument('--media-bindings',type=Path);p.add_argument('--output',type=Path,required=True);a=p.parse_args()
    assert a.composition.is_absolute() and a.output.is_absolute() and not a.output.is_relative_to(ROOT) and not a.output.exists()
    new,updates=phase.records();bindings=json.loads(a.media_bindings.read_text()) if a.media_bindings else {}
    preparation=Preparation(bindings);content=preparation.prepare(json.loads(a.composition.read_text()))
    a.output.mkdir(mode=0o700,parents=True)
    (a.output/'fidelity-model-prerequisites.json').write_text(json.dumps({'newDefinitions':new,'boundedPlaceholderUpdates':updates,'templateIds':h.TEMPLATES,'fieldIds':h.FIELDS,'renderingIds':h.RENDERINGS,'queries':phase.queries()},indent=2)+'\n')
    (a.output/'fidelity-content-plan.json').write_text(json.dumps(content,indent=2)+'\n')
    for bucket,records in [('model',new),('editorial',preparation.records)]:
        for r in records:
            f=a.output/bucket/(r['Path'].lstrip('/')+'.yml');f.parent.mkdir(parents=True,exist_ok=True);f.write_text(h.serialize(r))
    print(json.dumps({'status':'Offline preparation only','newDefinitions':len(new),'placeholderUpdates':len(updates),'corePages':len(content['pages']),'newEditorialRecords':len(preparation.records),'newDraftChanges':len(preparation.changes),'unboundImages':sum(not x['bound'] for x in preparation.media),'output':str(a.output)}))

if __name__=='__main__':main()
