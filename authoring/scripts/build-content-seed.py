#!/usr/bin/env python3
"""Build deterministic Liberty Mutual Sitecore model and initial content. Never pushes.
Run from repo root with Python 3 + PyYAML. Source content: docs/brand/portal-content-seeds.json.
The normal deployment script pushes models; seeds are explicitly opt-in and CreateOnly.
"""
from pathlib import Path
import json,uuid,html,yaml,re
ROOT=Path(__file__).resolve().parents[2]
BASE=ROOT/'authoring/items/liberty-mutual'; ITEMS=BASE/'items'
DATA=json.loads((ROOT/'docs/brand/portal-content-seeds.json').read_text())
SOURCES={s['id']:s for s in json.loads((ROOT/'docs/brand/source-manifest.json').read_text())['sources']}
NS=uuid.UUID('4a098fe0-ad6b-4722-9862-4e56b855337a')
def uid(key):return str(uuid.uuid5(NS,key))
def brace(s):return '{'+s.upper()+'}'
def f(i,h,v):return {'ID':i,'Hint':h,'Value':str(v)}
def upsert(lst,field):
 for n,x in enumerate(lst):
  if x['ID'].lower()==field['ID'].lower():lst[n]=field;return
 lst.append(field)
FIELDS={'base':'12c33f3f-86c5-43a5-aeb4-5598cec45116','std':'f7d48a55-2158-4f02-9356-756654404f73','sort':'ba3f86a2-4a1c-4d78-b63d-91c2779c1b5e','icon':'06d5295c-ed2f-4a54-9bf2-26228d113318','layout':'f1a1fe9e-a60c-4ddb-a3a0-bb5b29fe732e','workflow':'a4f985d9-98b3-4b52-aaaf-4344f6e747c6','defaultWorkflow':'ca9b9f52-4fb0-4f87-a79f-24dea62cda65','workflowState':'3e431de1-525e-47a3-b6b0-1ccbec3a8c98','masters':'1172f251-dad4-4efb-a329-0c63500e4f1e','display':'b5e02ad9-d56f-4c41-a065-a133db87bdeb','help':'9541e67d-ce8c-4225-803d-33f7f29f09ef'}
IDS={'projectTemplates':'94b480f8-5b0a-4487-99bb-238569489481','projectRenderings':'705f29fc-a5de-489e-9e2e-2dac8e03d084','projectPlaceholders':'e26a2d36-9ee9-49df-bb07-0073d8e20ccc','page':'2ec94e3d-439c-4fc6-bd4e-f08c7ddd9203','home':'ae9e45ca-f127-4abe-9ca7-2ff109981998','site':'f8db2730-a55f-412d-97f6-06a0951cce27','data':'20e904a1-9b60-43a1-a8d0-8e3aee45b115','variants':'19a63bdd-f9c6-403b-8068-c1884e9bb413','available':'2bcfce89-293c-4ddb-870a-78bce4777859','headlessLayout':'96e5f4ba-a2cf-4a4c-a4e7-64da88226362','basicWorkflow':'b4f49b23-4bba-4c79-ba22-f89f5f0d4e4f','pageApproved':'f7fe5bdd-a991-4a58-9735-cd08f9b097ab','datasourceWorkflow':'a053ed9f-4099-4682-9411-2b4c98e481e4','datasourceApproved':'4460e76c-87e9-4859-9de6-de122774937f'}
TEMPLATE='ab86861a-6030-46c5-b394-e8f99e8b87db';SECTION='e269fbb5-3750-427a-9149-7aa950b49301';FIELD='455a3e98-a627-4b40-8035-e683a0331ac7';FOLDER='a87a00b1-e6db-45ab-8b54-636fec3b5523';STD='1930bbeb-7805-471a-a3be-4858ac7cf696';DEVICE='fe5d7fdf-89c0-4d99-9aa3-b5fbd009c9f3'
SITE='/sitecore/content/LibertyMutual/liberty-mutual-agent-portal';TP='/sitecore/templates/Project/LibertyMutual'
LAYOUT_ROOT='/sitecore/layout/Layouts/Project/LibertyMutual'
PLACEHOLDER_ROOT='/sitecore/layout/Placeholder Settings/Project/LibertyMutual'
PLACEHOLDERS={'AgentGuidance':'headless-agent-guidance','ResourceSearch':'headless-resource-search','ResourceArticle':'headless-resource-article'}
LAYOUTS={'PortalLayout':['AgentGuidance'],'ResourcesLayout':['ResourceSearch','AgentGuidance'],'ResourceArticleLayout':['ResourceArticle']}
written=[]
class Dumper(yaml.SafeDumper):pass
def string_rep(dumper,data):return dumper.represent_scalar('tag:yaml.org,2002:str',data,style='|' if '\n' in data else '"' if data=='' else None)
Dumper.add_representer(str,string_rep)
def save(item,kind):
 for lang in item.get('Languages',[]):
  for version in lang.get('Versions',[]):
   if not version.get('Fields'):version['Fields']=[f('25bed78c-4957-4165-998a-ca1b52f67497','__Created','20260910T140000Z')]
 if 'Languages' in item:
  item['Languages']=[{key:lang[key] for key in ('Language','Fields','Versions') if key in lang} for lang in item['Languages']]
 prefixes={'templates':'/sitecore/templates/Project/','renderings':'/sitecore/layout/Renderings/Project/','placeholders':'/sitecore/layout/Placeholder Settings/Project/','layouts':'/sitecore/layout/Layouts/Project/','content':'/sitecore/content/'}
 path=ITEMS/kind/(item['Path'][len(prefixes[kind]):]+'.yml');path.parent.mkdir(parents=True,exist_ok=True)
 # Sitecore serialization uses a narrow YAML reader: single-quoted scalars are
 # retained literally. Normalize them to double-quoted JSON/YAML strings.
 serialized=yaml.dump(item,Dumper=Dumper,sort_keys=False,allow_unicode=True,width=100000)
 serialized=serialized.replace(': |-\n', ': |\n')
 serialized=re.sub(r"(?m)^(\s*(?:- )?[^:\n]+: )('.*')$",lambda m:m.group(1)+json.dumps(yaml.safe_load(m.group(2)),ensure_ascii=False),serialized)
 path.write_text('---\n'+serialized,encoding='utf-8');written.append(str(path.relative_to(ROOT)))
 return item['ID']
def item(path,parent,template,kind,shared=None,values=None,id=None,display=None):
 it={'ID':id or uid(path),'Parent':parent,'Template':template,'Path':path}
 if shared:it['SharedFields']=shared
 lang={'Language':'en','Versions':[{'Version':1,'Fields':values or []}]}
 if display:lang['Fields']=[f(FIELDS['display'],'__Display name',display)]
 it['Languages']=[lang];return save(it,kind)
def standard(templatepath,tid,workflow=None,values=None,shared=None):
 sf=shared or []
 if workflow:sf +=[f(FIELDS['defaultWorkflow'],'__Default workflow',brace(workflow))]
 return item(templatepath+'/__Standard Values',tid,tid,'templates',shared=sf,values=values,id=uid(templatepath+'/__Standard Values'))
def template(name,fielddefs=[],bases=[STD],workflow=None,sharedstd=None):
 path=TP+'/'+name;tid=uid(path);sf=[f(FIELDS['base'],'__Base template','\n'.join(brace(b) for b in bases)),f(FIELDS['icon'],'__Icon','Office/32x32/document_text.png'),f(FIELDS['std'],'__Standard values',brace(uid(path+'/__Standard Values')))]
 item(path,IDS['projectTemplates'],TEMPLATE,'templates',shared=sf,id=tid)
 if fielddefs:
  sec=item(path+'/Content',tid,SECTION,'templates')
  for n,(key,label,typ,description) in enumerate(fielddefs):
   fid=uid('field/'+name+'/'+key);fieldids[name+'.'+key]=fid
   sf=[f('ab162cc0-dc80-4abf-8871-998ee5d7ba32','Type',typ),f(FIELDS['sort'],'__Sortorder',(n+1)*100)]
   if typ=='Rich Text':sf.append(f('1eb8ae32-e190-44a6-968d-ed904c794ebf','Source','query:$xaRichTextProfile'))
   it={'ID':fid,'Parent':sec,'Template':FIELD,'Path':path+'/Content/'+key,'SharedFields':sf,'Languages':[{'Language':'en','Fields':[f('19a69332-a23e-4e70-8d16-b2640cb24cc8','Title',label),f(FIELDS['display'],'__Display name',label),f(FIELDS['help'],'__Short description',description)],'Versions':[{'Version':1,'Fields':[]}]}]}
   save(it,'templates')
 standard(path,tid,workflow=workflow,shared=sharedstd)
 templates[name]=tid;return tid
fieldids={};templates={}
guidance=[('eyebrow','Eyebrow','Single-Line Text','Short context label, for example Agency growth.'),('headline','Headline','Single-Line Text','Use a concise, useful next step.'),('body','Body','Rich Text','Reusable guidance; never include private agency or client data.'),('actionLink','Action link','General Link','Choose a working destination and a meaningful link label.')]
resources=[('title','Title','Single-Line Text','Specific resource title in sentence case.'),('summary','Summary','Multi-Line Text','A concise summary for browsing and search.'),('body','Body','Rich Text','Original approved resource copy with clear headings.'),('resourceType','Resource type','Single-Line Text','Guide, Checklist, State guidance, Learning path or other controlled label.'),('state','Risk state','Single-Line Text','TX, FL or IL; use All for reusable cross-state guidance.'),('reviewedAt','Source reviewed','Date','Date on which sources were checked, not a claim of corporate approval.'),('sourceLink','Source link','General Link','Official primary source when a factual or regulatory claim needs support.')]
meta=[x for x in resources if x[0]!='title']+ [('businessFamily','Business family','Single-Line Text','Stable taxonomy key such as small-commercial.'),('product','Product','Single-Line Text','Stable product key such as workers-compensation.'),('channel','Distribution channel','Single-Line Text','Independent-agent or wholesale context.')]
ag=template('AgentGuidance',guidance,workflow=IDS['datasourceWorkflow']);ra=template('ResourceArticle',resources,workflow=IDS['datasourceWorkflow'])
rs=template('ResourceSearch',[('search','Search configuration','Multi-Line Text','JSON configuration for the native resource search source. Change source and field mappings together; preserve valid JSON.')],workflow=IDS['datasourceWorkflow'])
params=template('PortalRenderingParameters',bases=['4247aad4-ebde-4994-998f-e067a51b1fe4','5c74e985-e055-43ff-b28c-db6c6a6450a2','44a022db-56d3-419a-b43b-e27e4d8e9c41','3db3eb10-f8d0-4cc9-be26-18ce7b139ec8'])
emptylayout='<r><d id="'+brace(DEVICE)+'" l="'+brace(uid(LAYOUT_ROOT+'/PortalLayout'))+'" /></r>'
portal=template('PortalPage',bases=[IDS['page']],workflow=IDS['basicWorkflow'],sharedstd=[f(FIELDS['layout'],'__Renderings',emptylayout)])
articlelayout='<r><d id="'+brace(DEVICE)+'" l="'+brace(uid(LAYOUT_ROOT+'/ResourceArticleLayout'))+'" /></r>'
resourcepage=template('ResourcePage',meta,bases=[portal],workflow=IDS['basicWorkflow'],sharedstd=[f(FIELDS['layout'],'__Renderings',articlelayout)])
# Home uses the tenant-created, project-owned Page template directly. Preserve
# that item's native identity and other defaults while aligning its layout.
page_std=ITEMS/'templates/LibertyMutual/Page/__Standard Values.yml'
page_defaults=yaml.safe_load(page_std.read_text(encoding='utf-8-sig'))
upsert(page_defaults.setdefault('SharedFields',[]),f(FIELDS['layout'],'__Renderings',emptylayout))
save(page_defaults,'templates')
for name,tid in [('GuidanceFolder',ag),('ResourcesFolder',ra),('SearchFolder',rs)]:
 t=template(name,bases=[FOLDER],sharedstd=[f(FIELDS['masters'],'__Masters',brace(tid))])
# Insert options for authoring pages.
stdpath=ITEMS/'templates/LibertyMutual/PortalPage/__Standard Values.yml';it=yaml.safe_load(stdpath.read_text());it['SharedFields'].append(f(FIELDS['masters'],'__Masters',brace(portal)+'\n'+brace(resourcepage)));save(it,'templates')
# Renderings expose default flat fields; no custom GraphQL resolver is required.
renderids={}
for name,tid in [('AgentGuidance',ag),('ResourceArticle',ra),('ResourceSearch',rs)]:
 path='/sitecore/layout/Renderings/Project/LibertyMutual/'+name;rid=uid(path);renderids[name]=rid
 sf=[f('037fe404-dd19-4bf7-8e30-4dadf68b27b0','componentName',name),f('1a7c85e5-dc0b-490d-9187-bb1dbcb4c72f','Datasource Template',TP+('/ResourcePage' if name=='ResourceArticle' else '/'+name)),f('b5b27af1-25ef-405c-87ce-369b3a004016','Datasource Location',SITE+('/Data/Guidance' if name=='AgentGuidance' else '/Data/Search' if name=='ResourceSearch' else '/Home/resources')),f('a77e8568-1ab3-44f1-a664-b7c37ec7810d','Parameters Template',brace(params)),f(FIELDS['icon'],'__Icon','Office/32x32/document_text.png')]
 allowed=[resourcepage] if name=='ResourceArticle' else [IDS['page'],portal] if name=='AgentGuidance' else [portal]
 item(path,IDS['projectRenderings'],'04646a89-996f-4ee7-878a-ffdbf1f0ef0d','renderings',shared=sf,id=rid,values=[f('1b58d065-fe74-43e3-ba20-54c9588b3011','AllowedOnTemplates','\n'.join(brace(t) for t in allowed))])
 variantroot=item(SITE+'/Presentation/Headless Variants/'+name,IDS['variants'],'49c111d0-6867-4798-a724-1f103166e6e9','content')
 for v in ['Default','Highlight'] if name=='AgentGuidance' else ['Default']:item(SITE+'/Presentation/Headless Variants/'+name+'/'+v,variantroot,'4d50cdae-c2d9-4de8-b080-8f992bfb1b55','content')
for name,key in PLACEHOLDERS.items():
 item(PLACEHOLDER_ROOT+'/'+key,IDS['projectPlaceholders'],'5c547d4e-7111-4995-95b0-6b561751bf2e','placeholders',shared=[f('7256bdab-1fd2-49dd-b205-cb4873d2917c','Placeholder Key',key),f('e391b526-d0c5-439d-803e-17512eae6222','Allowed Controls',brace(renderids[name]))])
item(LAYOUT_ROOT,'da04b275-8838-4a3a-afee-817cf1fdd2eb',FOLDER,'layouts')
for name,components in LAYOUTS.items():
 item(LAYOUT_ROOT+'/'+name,uid(LAYOUT_ROOT),'e4e11508-04a4-4b0b-a263-5201f811c9cd','layouts',shared=[f('a036b2bc-ba04-44f6-a75f-bae6cd242abf','Path','/Views/SXA JSS/SXA JSS Layout.cshtml'),f('80334869-86dc-4472-aa89-44cf1b2f6c9b','Placeholders','\n'.join(brace(uid(PLACEHOLDER_ROOT+'/'+PLACEHOLDERS[c])) for c in components))])
item(SITE+'/Presentation/Available Renderings/Agent portal',IDS['available'],'76da0a8d-fc7e-42b2-af1e-205b49e43f98','content',shared=[f('715ae6c0-71c8-4744-ab4f-65362d20ad65','Renderings','\n'.join(brace(i) for i in renderids.values()))])
folders={}
for name,t in [('Guidance','GuidanceFolder'),('Resources','ResourcesFolder'),('Search','SearchFolder')]:folders[name]=item(SITE+'/Data/'+name,IDS['data'],templates[t],'content')
def datasource(name,type,values,folder='Guidance',approved=True):
 sf=[f(FIELDS['workflow'],'__Workflow',brace(IDS['datasourceWorkflow']))]
 vf=[f(fieldids[type+'.'+k],k,v) for k,v in values.items()]
 if approved:vf.append(f(FIELDS['workflowState'],'__Workflow state',brace(IDS['datasourceApproved'])))
 return item(SITE+'/Data/'+folder+'/'+name,folders[folder],templates[type],'content',shared=sf,values=vf)
def link(label,url):return '<link text="'+html.escape(label,quote=True)+'" linktype="external" url="'+html.escape(url,quote=True)+'" />'
def layout(pageid,components):
 # The additive ProductSpotlight generator supplies ProductsLayout without
 # rewriting page snapshots. Run both generators before validating a fresh seed.
 layoutname='ProductsLayout' if pageid==uid(SITE+'/Home/products') else 'ResourceArticleLayout' if any(c[0]=='ResourceArticle' for c in components) else 'ResourcesLayout' if any(c[0]=='ResourceSearch' for c in components) else 'PortalLayout'
 r='<r><d id="'+brace(DEVICE)+'" l="'+brace(uid(LAYOUT_ROOT+'/'+layoutname))+'">'
 for n,(name,ds,variant) in enumerate(components):
  vid=uid(SITE+'/Presentation/Headless Variants/'+name+'/'+variant)
  r+='<r uid="'+brace(uid(pageid+'/rendering/'+str(n)))+'" id="'+brace(renderids[name])+'" ph="'+PLACEHOLDERS[name]+'" ds="'+brace(ds)+'" par="FieldNames='+brace(vid)+'&amp;DynamicPlaceholderId='+str(n+1)+'" />'
 return r+'</d></r>'
def page(slug,title,components,values=None,parentid=IDS['home'],parentpath=SITE+'/Home',tid=None,order=100):
 path=parentpath+'/'+slug;pid=uid(path);sf=[f(FIELDS['layout'],'__Renderings',layout(pid,components)),f(FIELDS['sort'],'__Sortorder',order),f(FIELDS['workflow'],'__Workflow',brace(IDS['basicWorkflow']))]
 vf=[f('d3bed2bd-a5f0-49ab-b7a5-6b72b0f34e4b','Title',title),f('4e0720e9-9d50-4ddc-87cf-ecd65e8e94c8','NavigationTitle',title),f(FIELDS['workflowState'],'__Workflow state',brace(IDS['pageApproved']))]
 if values:vf +=[f(fieldids['ResourcePage.'+k],k,v) for k,v in values.items()]
 item(path,parentid,tid or portal,'content',shared=sf,values=vf,id=pid,display=title);return pid
# Reusable, privacy-safe ABM promotions. The named variants are editorial content; native audiences are configured separately.
promotionids={}
for promo in DATA['promotions']:
 promotionids[promo['id']]=datasource(promo['id'],'AgentGuidance',{'eyebrow':'Agency growth','headline':promo['title'],'body':'<p>'+html.escape(promo['body'])+'</p>','actionLink':link(promo['ctaLabel'],promo['ctaHref'])})
neutral=promotionids['commercial-growth-neutral']
searchconfiguration={'searchIndex':'b5e24aff-8b5b-4653-bf66-deef52c1241a','fieldsMapping':{'title':'Title','description':'summary','state':'state','type':'resourceType','family':'businessFamily'}}
searchds=datasource('AgentResources','ResourceSearch',{'search':json.dumps(searchconfiguration,indent=2)},folder='Search')
# Stable top-level route pages. Operational data is supplied by the application server, not these items.
top=[('workspace','My workspace','Your next useful step','Review priorities, continue saved work and find guidance for the conversations ahead.','Find a resource','/resources'),('quote','Quote & submit','Prepare a clear submission','Bring the business story, risk locations and required information together before you send a request for review.','Review the preparation guide','/resources/build-a-bop-submission'),('clients','Clients & policies','Keep the next conversation moving','Review upcoming renewals, organize questions and save the follow-up that helps your client take the next step.','Open the renewal checklist','/resources/prepare-a-household-renewal'),('products','Products & appetite','Start with the right context','Explore product families and guidance, then check the risk state and business type for the work in front of you.','Browse resources','/resources'),('growth','Agency growth','Build confidence in your next chapter','Find practical learning and preparation resources that help your team develop its small-business conversations.','Explore the growth path','/resources/expand-small-business-practice'),('resources','Learning & resources','Useful guidance, easier to find','Find preparation checklists, state guidance and learning organized around the work you do.','Start with small business','/resources/expand-small-business-practice'),('support','Support','Bring your question to the right team','Keep the account context, open question and next step together when you request help.','Prepare a focused referral','/resources/specialty-referral')]
pageids={}
for n,(slug,title,headline,body,label,url) in enumerate(top):
 ds=neutral if slug=='workspace' else datasource(slug+'-guidance','AgentGuidance',{'eyebrow':title,'headline':headline,'body':'<p>'+html.escape(body)+'</p>','actionLink':link(label,url)})
 components=[('AgentGuidance',ds,'Highlight' if slug=='growth' else 'Default')]
 if slug=='resources':components.insert(0,('ResourceSearch',searchds,'Default'))
 pageids[slug]=page(slug,title,components,order=(n+1)*100)
# Existing Home keeps its native identity and fields; only intentional title/layout/workflow entries change.
homepath=ITEMS/'content/LibertyMutual/liberty-mutual-agent-portal/Home.yml';it=yaml.safe_load(homepath.read_text(encoding='utf-8-sig'))
for x in [f(FIELDS['layout'],'__Renderings',layout(IDS['home'],[('AgentGuidance',neutral,'Default')])),f(FIELDS['workflow'],'__Workflow',brace(IDS['basicWorkflow']))]:upsert(it.setdefault('SharedFields',[]),x)
vf=it['Languages'][0]['Versions'][0]['Fields']
for x in [f('d3bed2bd-a5f0-49ab-b7a5-6b72b0f34e4b','Title','My workspace'),f('4e0720e9-9d50-4ddc-87cf-ecd65e8e94c8','NavigationTitle','My workspace'),f(FIELDS['workflowState'],'__Workflow state',brace(IDS['pageApproved']))]:upsert(vf,x)
save(it,'content')
resourceids=[]
for r in DATA['resources']:
 source=SOURCES[r['sourceRefs'][0]] if r['sourceRefs'] else None
 vals={'title':r['title'],'summary':r['summary'],'body':r['bodyHtml'],'resourceType':r['resourceType'],'state':r['states'][0] if len(r['states'])==1 else 'All','reviewedAt':r['reviewedAt'].replace('-','')+'T000000Z','sourceLink':link(source['title'],source['url']) if source else ''}
 ds=uid(SITE+'/Home/resources/'+r['slug']);metadata={k:v for k,v in vals.items() if k!='title'};metadata.update({'businessFamily':r['family'],'product':r['product'],'channel':r['channel']})
 pid=page(r['slug'],r['title'],[('ResourceArticle',ds,'Default')],values=metadata,parentid=pageids['resources'],parentpath=SITE+'/Home/resources',tid=resourcepage)
 resourceids.append({'slug':r['slug'],'pageId':pid,'datasourceId':ds,'route':'/resources/'+r['slug']})
for hub in DATA['productHubs']:
 body='<p>'+html.escape(hub['summary'])+'</p><p>Explore '+html.escape(', '.join(hub['products']))+'. Product guidance is a starting point; availability and terms depend on the applicable product, risk and review.</p>'
 ds=datasource('product-'+hub['family'],'AgentGuidance',{'eyebrow':'Products & appetite','headline':hub['title'],'body':body,'actionLink':link('Explore the preparation guide','/resources/'+hub['resourceSlug'])})
 page(hub['family'],hub['title'],[('AgentGuidance',ds,'Highlight')],parentid=pageids['products'],parentpath=SITE+'/Home/products')
manifest={'schemaVersion':'1.0.0','site':SITE,'fieldIds':fieldids,'templateIds':templates,'renderingIds':renderids,'routePageIds':pageids,'promotions':promotionids,'resourceSearch':{'datasourceId':searchds,'sourceId':searchconfiguration['searchIndex'],'configuration':searchconfiguration},'resourcePages':resourceids,'seedWorkflowStatus':'Initial source-reviewed bootstrap items are Approved in existing Basic workflows. New author-created items use the native Draft initial state. This is sandbox editorial approval, not corporate brand approval.','unusedInitialResourceDatasources': [uid(SITE+'/Data/Resources/'+r['slug']) for r in DATA['resources']], 'generatedFiles':written}
manifest['placeholderIds']={key:uid(PLACEHOLDER_ROOT+'/'+key) for key in PLACEHOLDERS.values()}
manifest['layoutIds']={name:uid(LAYOUT_ROOT+'/'+name) for name in LAYOUTS}
manifest['generatedFiles']=list(dict.fromkeys(written))
(BASE/'content-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(f'Generated {len(written)} scoped Sitecore YAML files; {len(resourceids)} resource routes.')
