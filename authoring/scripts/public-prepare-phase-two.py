#!/usr/bin/env python3
"""Offline phase-two model, real-source media, and palette asset preparation.
Writes only a new private output directory outside the repository. No active
module files, CMS content, workflow, publication, Git, or deployments change.
"""
from pathlib import Path
import argparse, copy, html, importlib.util, json, re, sys
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[2]
def module(name,file):
    spec=importlib.util.spec_from_file_location(name,Path(__file__).with_name(file));result=importlib.util.module_from_spec(spec);spec.loader.exec_module(result);return result
h=module('phase_two_model','public-build-model.py')
content=module('phase_two_content','public-prepare-editorial-seed.py')
M=json.loads((h.BASE/'public-contract.json').read_text())
def icon_svg(body):
    return '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect x="1" y="1" width="62" height="62" rx="12" fill="#f4f2fc"/><g transform="translate(12 12)" fill="none" stroke="#20174b" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">'+body+'</g></svg>\n'
ICONS={
 'PublicHero':('Hero','<rect x="2" y="5" width="36" height="30" rx="3"/><path d="M7 13h10M7 18h8M7 25h10M23 30l5-7 5 7M23 10h10v10H23z"/>'),
 'PublicArticle':('Article text','<path d="M8 3h17l8 8v26H8zM25 3v9h8M13 18h15M13 24h15M13 30h10"/>'),
 'PublicImage':('Image','<rect x="3" y="5" width="34" height="30" rx="3"/><circle cx="12" cy="14" r="3"/><path d="m4 31 11-12 8 8 6-6 8 10"/>'),
 'PublicCta':('Call to action','<rect x="3" y="9" width="34" height="22" rx="5"/><path d="M10 20h19m-6-6 6 6-6 6"/>'),
 'PublicPromotion':('Promotion','<path d="M4 6h16l17 17-14 14L6 20z"/><circle cx="13" cy="13" r="3"/><path d="m22 20 7 7"/>'),
 'SharedDisclosure':('Disclosure','<path d="M20 3 35 9v12c0 8-8 14-15 17C13 35 5 29 5 21V9zM20 17v11"/><circle cx="20" cy="11" r="1"/>'),
 'PublicApprovedAnswer':('Approved answer','<path d="M5 5h30v23H20l-9 8v-8H5zM12 16l6 6 11-12"/>'),
 'PublicSearch':('Knowledge search','<circle cx="17" cy="16" r="11"/><path d="m25 25 11 11M12 12h10M12 17h7"/>'),
 'PublicProductSelector':('Product choices','<rect x="3" y="3" width="14" height="14" rx="3"/><rect x="23" y="3" width="14" height="14" rx="3"/><rect x="3" y="23" width="14" height="14" rx="3"/><path d="m27 29 4 4 7-9M7 10h6M27 10h6M7 30h6"/>'),
 'PublicQuoteHandoff':('Next step','<path d="M22 5h15v15M37 5 18 24M16 8H5v29h28V26"/>'),
 'PublicPageBody':('Page body','<rect x="3" y="3" width="34" height="34" rx="3"/><path d="M3 13h34M22 13v24M8 20h9M8 26h9M8 32h9"/>'),
 'PublicHeader':('Header','<rect x="3" y="4" width="34" height="32" rx="3"/><path d="M3 15h34M9 9h6M25 9h6"/>'),
 'PublicFooter':('Footer','<rect x="3" y="4" width="34" height="32" rx="3"/><path d="M3 25h34M9 31h6M25 31h6"/>'),
 'AgencyPriorities':('Agency priorities','<path d="m20 3 4 9 10 1-8 7 2 10-8-5-8 5 2-10-8-7 10-1zM5 37h30"/>'),
}
def records():
    h.RECORDS.clear();h.TEMPLATES.update(M['templateIds']);h.FIELDS.update(M['fieldIds']);h.RENDERINGS.update(M['renderingIds'])
    specs={
      'PublicSearch':[('heading','Heading','Single-Line Text'),('introduction','Introduction','Rich Text'),('search','Search configuration','Multi-Line Text')],
      'PublicProductOption':[('label','Label','Single-Line Text'),('productKey','Product key','Single-Line Text'),('image','Image','Image'),('quoteLink','Quote destination','General Link')],
      'PublicProductSelector':[('heading','Heading','Single-Line Text'),('introduction','Introduction','Rich Text'),('products','Ordered products','Multilist',h.SITE+'/Data/Product options'),('defaultProducts','Initially selected product keys','Single-Line Text'),('actionLink','Continue action','General Link'),('agentLink','Agent action','General Link'),('postcodeLabel','ZIP code label','Single-Line Text')],
      'PublicQuoteHandoff':[('heading','Heading','Single-Line Text'),('introduction','Introduction','Rich Text'),('products','Ordered destinations','Multilist',h.SITE+'/Data/Product options'),('agentLink','Agent finder','General Link')],
      'PublicCard':[('value','Featured value','Single-Line Text'),('heading','Heading','Single-Line Text'),('body','Body','Rich Text'),('image','Image','Image'),('actionLink','Action','General Link')],
      'PublicSection':[('heading','Heading','Rich Text'),('introduction','Introduction','Rich Text'),('items','Ordered cards','Multilist','query:./Cards/*'),('actionLink','Action','General Link')],
      'PublicSplitContent':[('heading','Heading','Rich Text'),('body','Body','Rich Text'),('image','Image','Image'),('primaryLink','Primary action','General Link'),('secondaryLink','Secondary action','General Link')],
      'PublicFaqItem':[('question','Question','Single-Line Text'),('answer','Answer','Rich Text')],
      'PublicFaq':[('heading','Heading','Single-Line Text'),('items','Ordered questions','Multilist','query:./Questions/*')],
      'PublicLink':[('link','Link','General Link'),('icon','Icon name','Single-Line Text')],
      'PublicBreadcrumbs':[('items','Ordered breadcrumbs','Multilist','query:./Links/*'),('currentLabel','Current page','Single-Line Text')],
      'PublicNavigationGroup':[('label','Label','Single-Line Text'),('links','Ordered links','Multilist','query:./Links/*')],
      'PublicFooterColumn':[('heading','Heading','Single-Line Text'),('body','Body','Rich Text'),('links','Ordered links','Multilist','query:./Links/*')],
    }
    for name,fields in specs.items():h.template(name,fields,icon='Office/32x32/'+('photo_landscape.png' if name=='PublicProductOption' else 'document_text.png'),workflow=M['workflow']['id'])
    # These new fields extend existing approved datasource templates without
    # modifying their data or standard values. New content needs Draft versions.
    additions={
      'PublicHero':[('quoteHeading','Quote heading','Rich Text')],
      'PublicHeader':[('navigation','Ordered navigation groups','Multilist','query:./Navigation/*'),('searchLink','Search','General Link'),('loginLink','Log in','General Link')],
      'PublicFooter':[('columns','Ordered columns','Multilist','query:./Columns/*'),('socialLinks','Social links','Multilist','query:./Social/*'),('legalLinks','Legal links','Multilist','query:./Legal/*'),('disclaimer','Disclaimer','Rich Text'),('mobileLogo','Mobile logo','Image')],
    }
    for name,fields in additions.items():
        sec=h.TP+'/'+name+'/Content'
        for n,(key,label,kind,*source) in enumerate(fields,1):
            fid=h.uid('field/'+name+'/'+key);h.FIELDS[name+'.'+key]=fid
            sf=[h.field('ab162cc0-dc80-4abf-8871-998ee5d7ba32','Type',kind),h.field(h.F['sort'],'__Sortorder',1000+n*100)]
            if source:sf.append(h.field('1eb8ae32-e190-44a6-968d-ed904c794ebf','Source',source[0]))
            elif kind=='Rich Text':sf.append(h.field('1eb8ae32-e190-44a6-968d-ed904c794ebf','Source','query:$xaRichTextProfile'))
            h.item(sec+'/'+key,h.uid(sec),h.T['field'],'templates',shared=sf,identifier=fid,label=label,language_fields=[h.field('19a69332-a23e-4e70-8d16-b2640cb24cc8','Title',label)])
    rendering_specs=[('PublicSearch','Knowledge search',h.SITE+'/Data/Search','apps/32x32/Search (1).png'),('PublicProductSelector','Product choices','query:./Data','Office/32x32/check_box.png'),('PublicQuoteHandoff','Next step','query:./Data','Office/32x32/navigate_right.png'),('PublicSection','Card section','query:./Data','Office/32x32/elements.png'),('PublicSplitContent','Image and text','query:./Data','Office/32x32/document_orientation_landscape.png'),('PublicFaq','Questions and answers','query:./Data','Office/32x32/question_and_answer.png'),('PublicBreadcrumbs','Breadcrumbs','query:./Data','Office/32x32/navigate_right.png')]
    variant_names={'PublicQuoteHandoff':['Default','Agent'],'PublicProductSelector':['Default','Quote','Compact'],'PublicSection':['Default','ProofCards','NumberedLinks','ImageCards','Bundles','QuoteCards'],'PublicSplitContent':['Default','ImageLeft','ImageRight','TextColumns','ImageRightSoft']}
    for name,label,location,icon in rendering_specs:
        rid=h.uid(h.RP+'/'+name);h.RENDERINGS[name]=rid
        h.item(h.RP+'/'+name,h.uid(h.RP),h.T['rendering'],'renderings',shared=[h.field('037fe404-dd19-4bf7-8e30-4dadf68b27b0','componentName',name),h.field('1a7c85e5-dc0b-490d-9187-bb1dbcb4c72f','Datasource Template',h.TP+'/'+name),h.field('b5b27af1-25ef-405c-87ce-369b3a004016','Datasource Location',location),h.field('a77e8568-1ab3-44f1-a664-b7c37ec7810d','Parameters Template',h.brace(M['templateIds']['PublicRenderingParameters'])),h.field(h.F['icon'],'__Icon',icon)],values=[h.field('1b58d065-fe74-43e3-ba20-54c9588b3011','AllowedOnTemplates',h.brace(M['templateIds']['PublicPage']))],label=label)
        vp=h.SITE+'/Presentation/Headless Variants/'+name
        h.item(vp,h.uid(h.SITE+'/Presentation/Headless Variants'),h.T['variantFolder'],'presentation')
        for n,v in enumerate(variant_names.get(name,['Default']),1):h.item(vp+'/'+v,h.uid(vp),h.T['variant'],'presentation',shared=[h.field(h.F['sort'],'__Sortorder',n*100)])
    for name,variant in [('PublicHero','QuoteIntro'),('PublicImage','Hero'),('PublicArticle','TrustStrip'),('PublicArticle','Centered'),('PublicArticle','CoverageTable')]:
        vp=h.SITE+'/Presentation/Headless Variants/'+name
        h.item(vp+'/'+variant,h.uid(vp),h.T['variant'],'presentation',shared=[h.field(h.F['sort'],'__Sortorder',300)])
    for label,names in [('Discovery',['PublicSearch']),('Insurance',['PublicProductSelector','PublicQuoteHandoff']),('Sections',['PublicSection','PublicSplitContent','PublicFaq','PublicBreadcrumbs'])]:
        h.item(h.SITE+'/Presentation/Available Renderings/'+label,h.uid(h.SITE+'/Presentation/Available Renderings'),h.T['available'],'presentation',shared=[h.field('715ae6c0-71c8-4744-ab4f-65362d20ad65','Renderings','|'.join(h.brace(h.RENDERINGS[n]) for n in names))])
    existing=[]
    def add_controls(current,names):
        old=current['fields']['Allowed Controls'].split('|')
        current['fields']['Allowed Controls']='|'.join(dict.fromkeys([*old,*[h.brace(h.RENDERINGS[n]) for n in names]]))
    for p in [h.PP+'/headless-public-content',h.SITE+'/Presentation/Placeholder Settings/headless-public-content']:
        current=copy.deepcopy(next(r for r in M['records'] if r['path']==p))
        add_controls(current,['PublicSearch','PublicProductSelector','PublicQuoteHandoff','PublicSection','PublicSplitContent','PublicFaq'])
        existing.append(current)
    for p in [h.PP+'/headless-public-hero',h.SITE+'/Presentation/Placeholder Settings/headless-public-hero']:
        current=copy.deepcopy(next(r for r in M['records'] if r['path']==p))
        add_controls(current,['PublicBreadcrumbs'])
        existing.append(current)
    return [r for _,r in h.RECORDS],existing
def queries():
    return {'referenceContract':'Native Layout Service resolves these reference fields directly; these are inspectable Edge integration queries, not fabricated SDK field objects or unverified custom resolvers.',
      'productOptions':'query ProductOptions($path: String!, $language: String!) { item(path: $path, language: $language) { id heading: field(name: "heading") { jsonValue } products: field(name: "products") { ... on MultilistField { targetIds targetItems { id label: field(name: "label") { jsonValue } productKey: field(name: "productKey") { jsonValue } image: field(name: "image") { jsonValue } quoteLink: field(name: "quoteLink") { jsonValue } } } } } }',
      'approvedAnswer':'query ApprovedAnswer($path: String!, $language: String!) { item(path: $path, language: $language) { id version question: field(name: "question") { jsonValue } answer: field(name: "answer") { jsonValue } sourceLink: field(name: "sourceLink") { jsonValue } canonicalUrl: field(name: "canonicalUrl") { jsonValue } disclosure: field(name: "disclosure") { ... on LookupField { targetItem { id body: field(name: "body") { jsonValue } } } } } }',
      'publicationRule':'Use the Live context for downstream APIs and Search projection. Preview is for native authoring. Draft content is never read from Preview and relabeled as approved.'}
def main():
    p=argparse.ArgumentParser();p.add_argument('--editorial',type=Path,required=True);p.add_argument('--assets',type=Path,required=True);p.add_argument('--home-image',type=Path,required=True);p.add_argument('--media-bindings',type=Path);p.add_argument('--output',type=Path,required=True);a=p.parse_args()
    assert all(x.is_absolute() for x in [a.editorial,a.assets,a.home_image,a.output]) and not a.output.is_relative_to(ROOT) and not a.output.exists(),'Use new private output outside active source.'
    a.output.mkdir(parents=True,mode=0o700)
    assets=json.loads(a.assets.read_text());bindings=json.loads(a.media_bindings.read_text()) if a.media_bindings else {}
    for key,binding in bindings.items():
        assert isinstance(binding,str) and re.match(r'<image\s',binding,re.I) and ('mediaid=' in binding.lower() or 'dam-id=' in binding.lower()),'Only actual native MediaID/MML fields are accepted: '+key
    actual=json.loads(a.home_image.read_text());home_field=next(f['value'] for f in actual['fields'] if f['name']=='image')
    assert actual['path']==h.SITE+'/Home/Data/Hero' and re.match(r'<image\s',home_field,re.I) and 'dam-id=' in home_field,'Expected the actual Page Builder-inserted MML field.'
    bindings['path:'+actual['path']]=home_field
    # This exact asset already has a real native MML field. Reuse it where the
    # editorial inventory deliberately selects the same basketball photograph.
    bindings.setdefault('family-basketball',home_field)
    (a.output/'native-image-bindings.private.json').write_text(json.dumps(bindings,indent=2)+'\n')
    content.RECORDS.clear();content.MEDIA.clear();seed=content.prepare(json.loads(a.editorial.read_text()),bindings)
    (a.output/'prepared-seed.json').write_text(json.dumps(seed,indent=2)+'\n')
    for r in seed['records']:
        f=a.output/'content-items'/(r['Path'][len(h.SITE):].lstrip('/')+'.yml');f.parent.mkdir(parents=True,exist_ok=True);f.write_text(h.serialize(r))
    new,updates=records();proposal={'schemaVersion':1,'state':'prepared only; no active modules or CMS writes','newDefinitions':new,'boundedExistingDefinitionUpdates':updates,'queries':queries(),'mediaRule':'Home Hero retains the actual native MML XML verbatim. Other images require actual upload-returned MediaIDs or verified native MML fields; unresolved assets remain blank and are reported as unbound.'}
    (a.output/'model-prerequisites.json').write_text(json.dumps(proposal,indent=2)+'\n')
    for r in new:
        f=a.output/'model-items'/(r['Path'].lstrip('/')+'.yml');f.parent.mkdir(parents=True,exist_ok=True);f.write_text(h.serialize(r))
    icon_manifest=[]
    for name,(label,body) in ICONS.items():
        f=a.output/'component-icons'/(name+'.svg');f.parent.mkdir(parents=True,exist_ok=True);f.write_text(icon_svg(body));icon_manifest.append({'componentName':name,'label':label,'file':str(f),'candidatePublicPath':'/images/component-icons/'+name+'.svg','nativeFieldCandidate':'__Thumbnail','verification':'Verify actual native thumbnailUrl and Page Builder tile after hosting and a scoped metadata apply; not claimed active.'})
    (a.output/'component-icons-manifest.json').write_text(json.dumps(icon_manifest,indent=2)+'\n')
    gallery='<!doctype html><meta charset="utf-8"><title>Component icons</title><style>body{font:16px system-ui;padding:30px;color:#20174b}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}.card{border:1px solid #ddd;border-radius:12px;padding:20px;display:flex;align-items:center;gap:15px}img{width:64px;height:64px}</style><h1>Component icons</h1><div class="grid">'+''.join('<div class="card"><img src="component-icons/'+x['componentName']+'.svg"><span>'+x['label']+'</span></div>' for x in icon_manifest)+'</div>'
    (a.output/'component-icons-preview.html').write_text(gallery)
    print(json.dumps({'state':'offline only','newNativeDefinitions':len(new),'existingDefinitionUpdates':len(updates),'contentRecords':len(seed['records']),'publicPages':len(seed['pages']),'answerDrafts':len(seed['answerIds']),'unboundImages':sum(not m['bound'] for m in seed['mediaBindings']),'homeMmlPreserved':True,'semanticIcons':len(icon_manifest)},indent=2))
if __name__=='__main__':main()
