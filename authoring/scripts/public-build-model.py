#!/usr/bin/env python3
"""Generate the public site's narrow native model and explicit CreateOnly seed.

Offline only. Never logs in, pushes, publishes, or restores authored content.
Run with Python 3 and PyYAML. --check is read-only and fails on source drift.
"""
from pathlib import Path
import argparse
import copy
import html
import json
import re
import uuid
from urllib.parse import urlsplit, urlunsplit
import yaml

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / "authoring/items/liberty-mutual-public"
NS = uuid.UUID("b89a310b-4b73-4594-aa72-c5ed3f2ca677")
IDENTITIES_FILE = BASE / "public-site-identities.json"
# Native site creation owns the platform scaffold. Its resulting identities are
# captured once and retained; model/editorial additions stay deterministic.
IDENTITIES = json.loads(IDENTITIES_FILE.read_text()) if IDENTITIES_FILE.exists() else {}
SCAFFOLD_FILE = BASE / "public-native-scaffold.json"
SCAFFOLD = json.loads(SCAFFOLD_FILE.read_text()) if SCAFFOLD_FILE.exists() else {}
SITE = "/sitecore/content/LibertyMutual/liberty-mutual-public-site"
TP = "/sitecore/templates/Project/LibertyMutualPublic"
RP = "/sitecore/layout/Renderings/Project/LibertyMutualPublic"
PP = "/sitecore/layout/Placeholder Settings/Project/LibertyMutualPublic"
PORTAL = "/sitecore/content/LibertyMutual/liberty-mutual-agent-portal"
def uid(key): return IDENTITIES.get(key, str(uuid.uuid5(NS, key)))
def brace(value): return "{" + value.upper() + "}"
def field(identifier, name, value): return {"ID": identifier, "Hint": name, "Value": str(value)}
def merge_fields(before,after):
    merged={f["ID"].lower():f for f in before}
    merged.update({f["ID"].lower():f for f in after})
    return list(merged.values())
F = {"base":"12c33f3f-86c5-43a5-aeb4-5598cec45116", "standard":"f7d48a55-2158-4f02-9356-756654404f73", "sort":"ba3f86a2-4a1c-4d78-b63d-91c2779c1b5e", "icon":"06d5295c-ed2f-4a54-9bf2-26228d113318", "layout":"f1a1fe9e-a60c-4ddb-a3a0-bb5b29fe732e", "masters":"1172f251-dad4-4efb-a329-0c63500e4f1e", "display":"b5e02ad9-d56f-4c41-a065-a133db87bdeb", "defaultWorkflow":"ca9b9f52-4fb0-4f87-a79f-24dea62cda65", "workflow":"a4f985d9-98b3-4b52-aaaf-4344f6e747c6", "workflowState":"3e431de1-525e-47a3-b6b0-1ccbec3a8c98"}
T = {"template":"ab86861a-6030-46c5-b394-e8f99e8b87db", "section":"e269fbb5-3750-427a-9149-7aa950b49301", "field":"455a3e98-a627-4b40-8035-e683a0331ac7", "folder":"a87a00b1-e6db-45ab-8b54-636fec3b5523", "templateFolder":"0437fee2-44c9-46a6-abe9-28858d9fee8c", "standard":"1930bbeb-7805-471a-a3be-4858ac7cf696", "rendering":"04646a89-996f-4ee7-878a-ffdbf1f0ef0d", "data":"1c82e550-ebcd-4e5d-8abd-d50d0809541e", "site":"3ac1911c-9089-4304-a8c5-34f36e7fb83a", "settings":"ebed7fed-5598-44d4-ba9e-8a4729cc0130", "presentation":"0a70fa73-8923-4a6e-abf3-4134f25f3221", "siteGroupingFolder":"8357f958-9aaa-46db-8898-36448a96356f", "siteGrouping":"e46f3af2-39fa-4866-a157-7017c4b2a40c", "partialFolder":"a13a9896-5efa-4481-941c-c388c4284ce2", "partial":"fd2059fd-6043-4dfe-8c04-e2437ce87634", "designFolder":"8df682c0-b099-463e-8aa7-b7eb401cf07a", "design":"1105b8f8-1e00-426b-bf1f-c840742d827b", "availableFolder":"26ec1d18-11b2-4dd9-8326-f6115f4fd7eb", "available":"76da0a8d-fc7e-42b2-af1e-205b49e43f98", "variantFolder":"49c111d0-6867-4798-a724-1f103166e6e9", "variant":"4d50cdae-c2d9-4de8-b080-8f992bfb1b55", "placeholder":"5c547d4e-7111-4995-95b0-6b561751bf2e", "sitePlaceholder":"d2a6884c-04d5-4089-a64e-d27ca9d68d4c", "branchFolder":"fbc802e5-4b9e-480f-93da-3f2a80cae5cb", "branch":"35e75c72-4985-4e09-88c3-0eac6cd1e64f"}
I = {"collection":"f7db0c93-12c2-4cef-b5c4-f7fb3d5ba017", "projectTemplates":"825b30b4-b40b-422e-9920-23a1b6bda89c", "projectRenderings":"1995806f-0a84-42b5-93b0-88f0e2ff872c", "projectPlaceholders":"f5f0fbe3-61ad-4967-a5d8-8d760331d6a1", "layout":"96e5f4ba-a2cf-4a4c-a4e7-64da88226362", "device":"fe5d7fdf-89c0-4d99-9aa3-b5fbd009c9f3", "pageWorkflow":"1bb54766-6a38-5c47-b0ee-c57570679d14", "pageDraft":"ce5c0c95-af32-5457-849b-11e8efaf72d7", "dataWorkflow":"1bb54766-6a38-5c47-b0ee-c57570679d14", "dataDraft":"ce5c0c95-af32-5457-849b-11e8efaf72d7", "portalPage":"d8e5d742-1ae3-5b2e-aba9-553d4a53c3fc", "collectionPage":"2ec94e3d-439c-4fc6-bd4e-f08c7ddd9203"}
RECORDS=[]
def item(path, parent, template, bucket, shared=None, values=None, identifier=None, label=None, language_fields=None):
    native=SCAFFOLD.get(path)
    if native:
        if path!=SITE+"/Home":template=native["template"]
        groups={"SHARED":shared or [],"UNVERSIONED":language_fields or [],"VERSIONED":values or []}
        configured={f["ID"].lower() for fields in groups.values() for f in fields}
        for existing in native["fields"]:
            if existing["id"].lower() not in configured:
                groups[existing["versioning"]].append(field(existing["id"],existing["name"],existing["value"]))
        shared,language_fields,values=groups["SHARED"],groups["UNVERSIONED"],groups["VERSIONED"]
    result={"ID":identifier or uid(path),"Parent":parent,"Template":template,"Path":path}
    if template in TEMPLATES.values() and template!=TEMPLATES.get("PublicRenderingParameters") and not path.endswith("/__Standard Values"):
        shared=[*(shared or []),field(F["workflow"],"__Workflow",brace(I["pageWorkflow"]))]
        values=[*(values or []),field(F["workflowState"],"__Workflow state",brace(I["pageDraft"]))]
    if shared: result["SharedFields"]=shared
    language={"Language":"en","Versions":[{"Version":1,"Fields":values or [field("25bed78c-4957-4165-998a-ca1b52f67497","__Created","20261031T160000Z")]}]}
    lf=language_fields or []
    if label: lf=[*lf,field(F["display"],"__Display name",label)]
    if lf: language["Fields"]=lf
    language={key:language[key] for key in ("Language","Fields","Versions") if key in language}
    result["Languages"]=[language]
    RECORDS.append((bucket,result)); return result["ID"]
def fs(values): return [field(F[name],"__"+{"standard":"Standard values","base":"Base template","sort":"Sortorder","icon":"Icon","layout":"Renderings","masters":"Masters","defaultWorkflow":"Default workflow","workflow":"Workflow","workflowState":"Workflow state"}.get(name,name),value) for name,value in values.items()]
FIELDS={}; TEMPLATES={}; RENDERINGS={}; VARIANTS={}
def template(name, defs=(), bases=None, icon="Office/32x32/document_text.png", workflow=None):
    p=TP+"/"+name; tid=uid(p); TEMPLATES[name]=tid
    shared=fs({"base":"|".join(brace(b) for b in (bases or [T["standard"]])),"standard":brace(uid(p+"/__Standard Values")),"icon":icon})
    item(p,uid(TP),T["template"],"templates",shared=shared)
    if workflow is None and name!="PublicRenderingParameters": workflow=I["pageWorkflow"]
    default=fs({"defaultWorkflow":brace(workflow)}) if workflow else []
    item(p+"/__Standard Values",tid,tid,"templates",shared=default)
    if defs:
        sec=p+"/Content"; item(sec,tid,T["section"],"templates")
        for n,definition in enumerate(defs,1):
            key,label,kind,*source=definition; fid=uid("field/"+name+"/"+key); FIELDS[name+"."+key]=fid
            sf=[field("ab162cc0-dc80-4abf-8871-998ee5d7ba32","Type",kind),field(F["sort"],"__Sortorder",n*100)]
            if source: sf.append(field("1eb8ae32-e190-44a6-968d-ed904c794ebf","Source",source[0]))
            elif kind=="Rich Text": sf.append(field("1eb8ae32-e190-44a6-968d-ed904c794ebf","Source","query:$xaRichTextProfile"))
            item(sec+"/"+key,uid(sec),T["field"],"templates",shared=sf,identifier=fid,label=label,language_fields=[field("19a69332-a23e-4e70-8d16-b2640cb24cc8","Title",label)])
    return tid
def data(p, name, values):
    # New editorial content starts in Draft. Approval/publication is an explicit
    # native action, not a side effect of a frontend build or this generator.
    vf=[field(FIELDS[name+"."+k],k,v) for k,v in values.items()]
    return item(p,uid(p.rsplit("/",1)[0]),TEMPLATES[name],"content",values=vf)
def link(label,url):
    # General Link's serializer exposes query/fragment separately. Putting a
    # question mark in href makes Next's Link treat it as part of the pathname.
    parsed=urlsplit(url);base=urlunsplit((parsed.scheme,parsed.netloc,parsed.path,'',''))
    attrs={'text':label,'linktype':'external','url':base}
    if parsed.query:attrs['querystring']=parsed.query
    if parsed.fragment:attrs['anchor']=parsed.fragment
    return '<link '+' '.join(k+'="'+html.escape(v,quote=True)+'"' for k,v in attrs.items())+' />'
def placement(page,name,ph,ds="",variant="Default",n=1):
    par="FieldNames="+brace(VARIANTS[name+"."+variant])+"&amp;DynamicPlaceholderId="+str(n)
    return '<r uid="'+brace(uid(page+"/rendering/"+name+"/"+str(n)))+'" id="'+brace(RENDERINGS[name])+'" ph="'+ph+'" ds="'+html.escape(ds,quote=True)+'" par="'+par+'" />'
def layout(renderings, with_layout=True):
    return '<r><d id="'+brace(I["device"])+(('" l="'+brace(I["layout"])) if with_layout else '')+'">'+''.join(renderings)+'</d></r>'

def build(include_editorial=True):
    # All new developer definitions have their own project roots. Existing
    # LibertyMutual.Model's broad includes therefore cannot overlap these.
    item(TP,I["projectTemplates"],T["templateFolder"],"templates")
    item(RP,I["projectRenderings"],T["folder"],"renderings")
    item(PP,I["projectPlaceholders"],T["folder"],"placeholders")
    template("PublicRenderingParameters",bases=["4247aad4-ebde-4994-998f-e067a51b1fe4","5c74e985-e055-43ff-b28c-db6c6a6450a2","44a022db-56d3-419a-b43b-e27e4d8e9c41","3db3eb10-f8d0-4cc9-be26-18ce7b139ec8"])
    page=template("PublicPage",[("metadataTitle","Search title","Single-Line Text"),("metadataDescription","Search description","Multi-Line Text"),("ogTitle","Social title","Single-Line Text"),("ogDescription","Social description","Multi-Line Text"),("canonicalUrl","Canonical URL","Single-Line Text"),("audience","Audience","Single-Line Text"),("state","State applicability","Single-Line Text"),("product","Product","Single-Line Text")],bases=[I["collectionPage"]],workflow=I["pageWorkflow"])
    template("PublicHero",[("eyebrow","Eyebrow","Single-Line Text"),("heading","Heading","Single-Line Text"),("summary","Summary","Rich Text"),("image","Image","Image"),("primaryLink","Primary action","General Link"),("secondaryLink","Secondary action","General Link")],icon="Office/32x32/document_header.png")
    template("PublicPromotion",[("eyebrow","Eyebrow","Single-Line Text"),("headline","Headline","Single-Line Text"),("body","Body","Rich Text"),("image","Image","Image"),("actionLink","Action","General Link"),("disclosure","Disclosure","Droptree",SITE+"/Data/Disclosures")],icon="Office/32x32/megaphone.png",workflow=I["dataWorkflow"])
    template("SharedDisclosure",[("title","Title","Single-Line Text"),("body","Disclosure","Rich Text"),("sourceLink","Authoritative source","General Link"),("owner","Content owner","Single-Line Text"),("effectiveDate","Effective date","Date"),("reviewDate","Review date","Date")],icon="Office/32x32/document_certificate.png",workflow=I["dataWorkflow"])
    template("PublicArticle",[("heading","Heading","Single-Line Text"),("body","Body","Rich Text")])
    template("PublicImage",[("image","Image","Image"),("caption","Caption","Single-Line Text")],icon="Office/32x32/photo_landscape.png")
    template("PublicCta",[("heading","Heading","Single-Line Text"),("body","Body","Rich Text"),("actionLink","Action","General Link")],icon="Office/32x32/navigate_right.png")
    template("PublicHeader",[("logo","Logo","Image"),*[(k,l,"General Link") for k,l in [("homeLink","Home"),("autoLink","Auto"),("homeInsuranceLink","Home insurance"),("bundlingLink","Bundling"),("resourcesLink","Resources"),("contactLink","Contact"),("quoteLink","Quote")]]],icon="Office/32x32/navigate_up.png")
    template("PublicFooter",[("logo","Logo","Image"),("body","Body","Rich Text"),("contactLink","Contact","General Link"),("privacyLink","Privacy","General Link"),("termsLink","Terms","General Link")],icon="Office/32x32/navigate_down.png")
    template("PublicApprovedAnswer",[("question","Question","Single-Line Text"),("canonicalUrl","Canonical published URL","Single-Line Text"),("answer","Plain-language answer","Multi-Line Text"),("formalWording","Formal source wording","Rich Text"),("explanation","Detailed explanation","Rich Text"),("sourceLink","Authoritative source","General Link"),("owner","Content owner","Single-Line Text"),("effectiveDate","Effective date","Date"),("reviewDate","Review date","Date"),("state","State applicability","Single-Line Text"),("product","Product","Single-Line Text"),("audience","Audience","Single-Line Text"),("nextStep","Next step","General Link"),("disclosure","Disclosure","Droptree",SITE+"/Data/Disclosures")],icon="Office/32x32/question_and_answer.png",workflow=I["dataWorkflow"])
    template("AgencyPriority",[("Heading","Heading","Single-Line Text"),("Body","Body","Rich Text"),("Image","Image","Image"),("Link","Action","General Link"),("Eyebrow","Eyebrow","Single-Line Text")],icon="Office/32x32/document_heart.png",workflow=I["dataWorkflow"])
    template("AgencyPriorities",[("Heading","Heading","Single-Line Text"),("Intro","Introduction","Rich Text"),("Recommendations","Ordered recommendations","Treelist","DataSource="+PORTAL+"/Data/Agency priorities/Recommendations&IncludeTemplatesForSelection="+uid(TP+"/AgencyPriority"))],icon="Office/32x32/folder_heart.png",workflow=I["dataWorkflow"])
    contracts=[("PublicHero","Hero","PublicHero","query:./Data","Office/32x32/document_header.png"), ("PublicPromotion","Promotion","PublicPromotion",SITE+"/Data/Promotions","Office/32x32/megaphone.png"), ("SharedDisclosure","Disclosure","SharedDisclosure",SITE+"/Data/Disclosures","Office/32x32/document_certificate.png"), ("PublicArticle","Article text","PublicArticle","query:./Data","Office/32x32/document_text.png"), ("PublicImage","Image","PublicImage","query:./Data","Office/32x32/photo_landscape.png"), ("PublicCta","Call to action","PublicCta","query:./Data","Office/32x32/navigate_right.png"), ("PublicHeader","Header","PublicHeader","query:./Data","Office/32x32/navigate_up.png"), ("PublicFooter","Footer","PublicFooter","query:./Data","Office/32x32/navigate_down.png"), ("PublicPageBody","Page body",None,"","Office/32x32/layout.png"), ("PublicApprovedAnswer","Approved answer","PublicApprovedAnswer",SITE+"/Data/Approved answers","Office/32x32/question_and_answer.png"), ("AgencyPriorities","Agency priorities","AgencyPriorities",PORTAL+"/Data/Agency priorities","Office/32x32/folder_heart.png")]
    for name,label,ds,location,icon in contracts:
        RENDERINGS[name]=uid(RP+"/"+name)
        sf=[field("037fe404-dd19-4bf7-8e30-4dadf68b27b0","componentName",name),field("1a7c85e5-dc0b-490d-9187-bb1dbcb4c72f","Datasource Template",TP+"/"+ds if ds else ""),field("b5b27af1-25ef-405c-87ce-369b3a004016","Datasource Location",location),field("a77e8568-1ab3-44f1-a664-b7c37ec7810d","Parameters Template",brace(TEMPLATES["PublicRenderingParameters"])),field(F["icon"],"__Icon",icon)]
        if name=="PublicPageBody": sf += [field("e829c217-5e94-4306-9c48-2634b094fdc2","OtherProperties","IsRenderingsWithDynamicPlaceholders=true"),field("069a8361-b1cd-437c-8c32-a3be78941446","Placeholders",brace(uid(PP+"/headless-public-hero"))+"|"+brace(uid(PP+"/headless-public-content")))]
        allowed=[page]
        if name in ["PublicHeader","PublicFooter","PublicPageBody"]: allowed.append(T["partial"])
        if name in ["AgencyPriorities","SharedDisclosure"]: allowed += [I["portalPage"],I["collectionPage"]]
        item(RP+"/"+name,uid(RP),T["rendering"],"renderings",shared=sf,label=label,values=[field("1b58d065-fe74-43e3-ba20-54c9588b3011","AllowedOnTemplates","|".join(brace(x) for x in allowed))])
        vp=SITE+"/Presentation/Headless Variants/"+name
        item(vp,uid(SITE+"/Presentation/Headless Variants"),T["variantFolder"],"presentation")
        for n,v in enumerate(["Default","Compact"] if name=="PublicPromotion" else ["Default","Centered"] if name=="PublicHero" else ["Default"],1):
            VARIANTS[name+"."+v]=uid(vp+"/"+v);item(vp+"/"+v,uid(vp),T["variant"],"presentation",shared=fs({"sort":n*100}))
    # Site-specific restrictions shadow the platform root placeholders only for
    # this site. Every nested slot has an explicit nonempty allowlist.
    allowed={"headless-header":["PublicHeader"],"headless-main":["PublicPageBody"],"headless-footer":["PublicFooter"],"headless-public-hero":["PublicHero"],"headless-public-content":["PublicArticle","PublicImage","PublicCta","PublicPromotion","SharedDisclosure","PublicApprovedAnswer"]}
    for key,components in allowed.items():
        fields=[field("7256bdab-1fd2-49dd-b205-cb4873d2917c","Placeholder Key",key+("-{*}" if key.startswith("headless-public-") else "")),field("e391b526-d0c5-439d-803e-17512eae6222","Allowed Controls","|".join(brace(RENDERINGS[c]) for c in components))]
        item(PP+"/"+key,uid(PP),T["placeholder"],"placeholders",shared=fields)
        item(SITE+"/Presentation/Placeholder Settings/"+key,uid(SITE+"/Presentation/Placeholder Settings"),T["sitePlaceholder"],"presentation",shared=fields)
    for key,component in [('headless-agency-priorities','AgencyPriorities'),('headless-shared-disclosure','SharedDisclosure')]:
        item(PP+'/'+key,uid(PP),T['placeholder'],'placeholders',shared=[field('7256bdab-1fd2-49dd-b205-cb4873d2917c','Placeholder Key',key),field('e391b526-d0c5-439d-803e-17512eae6222','Allowed Controls',brace(RENDERINGS[component]))])
    # Native site seed is deliberately separate from model/presentation deploys.
    item(SITE,I["collection"],T["site"],"site",shared=[field("85a7501a-86d9-4243-9075-0b727c3a6db4","Name","Liberty Mutual Public Website"),field("89cecf4f-e545-44f2-813d-272c08661d14","Description","Insurance guidance and useful next steps for individuals and families.")])
    for child,tid in [("Data",T["data"]),("Settings",T["settings"]),("Presentation",T["presentation"])]: item(SITE+"/"+child,uid(SITE),tid,"site" if child!="Presentation" else "presentation")
    for folder in ["Promotions","Disclosures","Approved answers","Taxonomy"]:item(SITE+"/Data/"+folder,uid(SITE+"/Data"),T["folder"],"content")
    for child,tid in [("Page Designs",T["designFolder"]),("Partial Designs",T["partialFolder"]),("Headless Variants","da26c636-96e1-45e4-88d6-3fcec70d5699"),("Placeholder Settings","52288e39-7830-4694-b62d-32a54c6ef7ba"),("Available Renderings",T["availableFolder"]),("Page Branches",T["branchFolder"])]:
        p=SITE+"/Presentation/"+child
        sf=[field("878c9a33-e760-4cb8-aad3-b2309383bf10","Group renderings in sections","1")] if child=="Available Renderings" else []
        item(p,uid(SITE+"/Presentation"),tid,"presentation",shared=sf)
    branch_path=SITE+"/Presentation/Page Branches/Landing page"
    rule='<ruleset><rule uid="'+brace(uid(branch_path+'/rule'))+'" name="Landing pages beneath Home"><conditions><condition id="{4F5389E9-79B7-4FE1-A43A-EEA4ECD19C94}" uid="'+brace(uid(branch_path+'/condition'))+'" operatorid="{066602E2-ED1D-44C2-A698-7ED27FD3A2CC}" value="'+brace(uid(SITE+'/Home'))+'" /></conditions><actions><action id="{D46EC8E5-7B46-47DE-B44A-4C5C30EF48D1}" uid="'+brace(uid(branch_path+'/action'))+'" PageBranchId="'+brace(uid(branch_path))+'" /></actions></rule></ruleset>'
    branch_settings=next(r for _,r in RECORDS if r['Path']==SITE+'/Presentation/Page Branches')
    branch_settings['SharedFields']=merge_fields(branch_settings.get('SharedFields',[]),[field('bb3391dd-f8be-4b2e-ae9f-47bb63c166ce','Rule',rule)])
    grouping=SITE+"/Settings/Site Grouping";item(grouping,uid(SITE+"/Settings"),T["siteGroupingFolder"],"site")
    item(grouping+"/liberty-mutual-public-site",uid(grouping),T["siteGrouping"],"site",shared=[field("cb4e9e2e-2b66-43dc-ad3f-9caf363d28d3","SiteName","liberty-mutual-public-site"),field("1ee576af-ba8e-4312-9fbd-2ccf8395baa1","StartItem",brace(uid(SITE+"/Home"))),field("8e0dd914-9afb-4d45-bf8b-7ff5d6e5337e","HostName","liberty-mutual-public-site.vercel.app"),field("9eaf6dc9-b811-4cda-9edd-9697faba628a","POS","en=liberty-mutual-public-site"),field("f57099a3-526a-49f2-aebd-635453e48875","RenderingHost","liberty-mutual-public-site"),field("da06d09e-02b6-464a-80fc-9d8d7fc875e3","Environment","*")])
    settings=next(r for _,r in RECORDS if r["Path"]==SITE+"/Settings")
    settings["SharedFields"]=merge_fields(settings.get("SharedFields",[]),[field("3e4f559f-8e59-4405-b50d-619811371f6c","Name","liberty-mutual-public-site"),field("32ce6bbe-4217-46e5-9335-42793884cbe3","AppTemplate",brace(T["site"])),field("5764d2d4-724d-4313-a81b-9246c911faff","AppDatasourcesPath",brace(uid(SITE+"/Data"))),field("5ca117eb-8782-4a4f-9f2f-30de31fc2e34","PlaceholdersPath",brace(uid(PP))),field("c8d002f9-9518-4c5e-9baa-6617e13f0797","LayoutPath",brace(I["layout"])),field("e8881464-38af-4655-be4a-ee10586578a2","Templates",brace(uid(TP))),field("f29428d5-1285-48b8-a884-44057965829a","RenderingsPath",brace(uid(RP))),field("9016141c-ff51-40f2-9135-40f5161b9784","ServerSideRenderingEngine","http"),field("72e83c8d-3578-4e50-b4c0-93a78a1729f2","FilesystemPath","/dist/liberty-mutual-public-site")])
    for group,names in {"Structure":["PublicPageBody"],"Content":["PublicHero","PublicArticle","PublicImage","PublicCta"],"Promotions":["PublicPromotion"],"Guidance":["PublicApprovedAnswer","SharedDisclosure"]}.items():
        item(SITE+"/Presentation/Available Renderings/"+group,uid(SITE+"/Presentation/Available Renderings"),T["available"],"presentation",shared=[field("715ae6c0-71c8-4744-ab4f-65362d20ad65","Renderings","|".join(brace(RENDERINGS[n]) for n in names))])
    for path,native in SCAFFOLD.items():
        if path.startswith(SITE+"/Presentation/Available Renderings/") and not any(r["Path"]==path for _,r in RECORDS):
            item(path,uid(path.rsplit("/",1)[0]),native["template"],"presentation",shared=[field("715ae6c0-71c8-4744-ab4f-65362d20ad65","Renderings","")])
    for label,component,ph in [("Header","PublicHeader","headless-header"),("Page body","PublicPageBody","headless-main"),("Footer","PublicFooter","headless-footer")]:
        p=SITE+"/Presentation/Partial Designs/"+label
        placed=placement(p,component,ph,"local:/Data/"+label if component!="PublicPageBody" else "")
        final='<r xmlns:p="p" xmlns:s="s" p:p="1"><d id="'+brace(I['device'])+'">'+re.sub(r'\b(id|ds|ph|par)=',r's:\1=',placed)+'</d></r>'
        item(p,uid(SITE+"/Presentation/Partial Designs"),T["partial"],"presentation",shared=[field("55faae90-3bba-4f7f-96fe-13c3f40055ff","Signature","public-"+label.lower().replace(" ","-")),field(F["layout"],"__Renderings",layout([placed]))],values=[field('04bf00db-f5fb-41f7-8ab7-22408372a981','__Final Renderings',final)])
        # Native Page Builder creates this companion when creating a partial.
        # Explicit source provisioning must supply the same signature contract;
        # otherwise Layout Service emits an empty partial wrapper.
        signature='sxa-public-'+label.lower().replace(' ','-')
        partial_ph=SITE+'/Presentation/Placeholder Settings/Partial Design/'+label
        item(partial_ph,uid(SITE+'/Presentation/Placeholder Settings/Partial Design'),T['sitePlaceholder'],'presentation',shared=[field('7256bdab-1fd2-49dd-b205-cb4873d2917c','Placeholder Key',signature),field('e391b526-d0c5-439d-803e-17512eae6222','Allowed Controls',brace(RENDERINGS[component]))])
        if component!="PublicPageBody":
            item(p+"/Data",uid(p),T["data"],"partial-content")
            vals={"homeLink":link("Home","/"),"autoLink":link("Auto","/vehicle/auto-insurance"),"homeInsuranceLink":link("Home","/property/homeowners-insurance"),"bundlingLink":link("Bundle","/bundling"),"resourcesLink":link("Resources","/insurance-resources"),"contactLink":link("Contact","/contact-an-agent"),"quoteLink":link("Get a quote","/get-a-quote")} if component=="PublicHeader" else {"body":"<p>Liberty Mutual Insurance</p>","contactLink":link("Contact us","/contact-an-agent"),"privacyLink":link("Privacy","https://www.libertymutual.com/privacy-policy"),"termsLink":link("Terms","https://www.libertymutual.com/terms-conditions")}
            item(p+"/Data/"+label,uid(p+"/Data"),TEMPLATES[component],"partial-content",values=[field(FIELDS[component+"."+k],k,v) for k,v in vals.items()])
    design=SITE+"/Presentation/Page Designs/Public website"
    item(design,uid(SITE+"/Presentation/Page Designs"),T["design"],"presentation",shared=[field("0966b999-0d0e-4278-acc9-9da69d461fe6","PartialDesigns","|".join(brace(uid(SITE+"/Presentation/Partial Designs/"+n)) for n in ["Header","Page body","Footer"]))])
    designroot=next(r for _,r in RECORDS if r["Path"]==SITE+"/Presentation/Page Designs")
    designroot["SharedFields"]=[field("ba1f60d6-3deb-40cc-bb61-eec772279ee1","TemplatesMapping",brace(page)+"="+brace(uid(design)))]
    # Landing branch has fresh, intentionally blank local editorial items.
    branch=SITE+"/Presentation/Page Branches/Landing page"; proto=branch+"/$name"
    item(branch,uid(SITE+"/Presentation/Page Branches"),T["branch"],"branch")
    for p,title in [(proto,"$name"),(SITE+"/Home","Liberty Mutual"),(SITE+"/Home/bundling","Bundle home and auto insurance")]:
        bucket="branch" if p==proto else "content"
        components=[placement(p,"PublicHero","/headless-main/sxa-public-page-body/headless-public-hero-1","page:/Data/Hero",n=2),placement(p,"PublicArticle","/headless-main/sxa-public-page-body/headless-public-content-1","page:/Data/Introduction",n=3)]
        if p!=proto:components += [placement(p,"PublicPromotion","/headless-main/sxa-public-page-body/headless-public-content-1",brace(uid(SITE+"/Data/Promotions/Bundle and save")),"Compact" if p.endswith("bundling") else "Default",4),placement(p,"SharedDisclosure","/headless-main/sxa-public-page-body/headless-public-content-1",brace(uid(SITE+"/Data/Disclosures/Product availability notice")),n=5)]
        item(p,uid(branch) if p==proto else uid(SITE) if p==SITE+"/Home" else uid(SITE+"/Home"),page,bucket,shared=fs({"layout":layout(components),"masters":brace(T["data"])+"|"+brace(uid(branch))}),values=[field("d3bed2bd-a5f0-49ab-b7a5-6b72b0f34e4b","Title",title),field("4e0720e9-9d50-4ddc-87cf-ecd65e8e94c8","NavigationTitle",title)])
        item(p+"/Data",uid(p),T["data"],bucket,shared=fs({"masters":"|".join(brace(TEMPLATES[n]) for n in ["PublicHero","PublicArticle","PublicImage","PublicCta"])}))
        hero={k:"" for k in ["eyebrow","heading","summary","image","primaryLink","secondaryLink"]}
        article={"heading":"","body":""}
        if p!=proto:
            bundle=p.endswith("bundling")
            hero.update({"eyebrow":"HOME AND AUTO" if bundle else "LIBERTY MUTUAL INSURANCE","heading":"Better together. Home and auto insurance." if bundle else "Protection for the life you live.","summary":"<p>Bring your home and auto insurance together, and explore coverage that fits your needs.</p>" if bundle else "<p>Explore insurance for your home, car, and the things that matter to you.</p>","primaryLink":link("Start your quote","/get-a-quote"),"secondaryLink":link("Explore bundling","/bundling") if not bundle else link("Find answers","/insurance-resources")})
            article={"heading":"Make room for what matters.","body":"<p>Understand your options, find useful guidance, and take your next step with confidence.</p>"}
        for name,component,vals in [("Hero","PublicHero",hero),("Introduction","PublicArticle",article)]:item(p+"/Data/"+name,uid(p+"/Data"),TEMPLATES[component],bucket,values=[field(FIELDS[component+"."+k],k,v) for k,v in vals.items()])
    data(SITE+"/Data/Promotions/Bundle and save","PublicPromotion",{"eyebrow":"BETTER TOGETHER","headline":"Bundle your home and auto insurance","body":"<p>Keep your home and auto coverage together. Explore your options and see what works for you.</p>","image":"","actionLink":link("Explore bundling","/bundling"),"disclosure":brace(uid(SITE+"/Data/Disclosures/Product availability notice"))})
    # No invented corporate approval: source/owner are visible editorial fields,
    # while native workflow and publication determine delivery eligibility.
    data(SITE+"/Data/Disclosures/Product availability notice","SharedDisclosure",{"title":"Coverage and availability","body":"<p>Coverage, discounts, and availability vary by state and individual circumstances. Review your policy for its terms, conditions, and exclusions.</p>","sourceLink":link("Liberty Mutual","https://www.libertymutual.com/"),"owner":"Public website content team","effectiveDate":"","reviewDate":""})
    # Standard values select the site design through native template mapping;
    # local Data insertion is allowed without adding numbered page body fields.
    std=next(r for _,r in RECORDS if r["Path"]==TP+"/PublicPage/__Standard Values")
    std["SharedFields"] += [*fs({"layout":layout([]),"masters":brace(T["data"])}),field('24171bf1-c0e1-480e-be76-4c0a1876f916','Page Design',brace(uid(design)))]
    std['Languages'][0]['Versions'][0]['Fields']=[field('25bed78c-4957-4165-998a-ca1b52f67497','__Created','20261031T160000Z'),field('d3bed2bd-a5f0-49ab-b7a5-6b72b0f34e4b','Title','$name')]
    preserved=BASE/'public-preserved-presentation-metadata.json'
    if preserved.exists():
        for path,groups in json.loads(preserved.read_text()).items():
            r=next(r for _,r in RECORDS if r['Path']==path)
            r['SharedFields']=merge_fields(r.get('SharedFields',[]),groups.get('shared',[]))
            r['Languages'][0]['Versions'][0]['Fields']=merge_fields(r['Languages'][0]['Versions'][0]['Fields'],groups.get('versioned',[]))
    # Activated developer additions are separate from the initial editorial
    # snapshots. A normal definition deployment never includes the latter.
    extensions=BASE/'public-model-extensions.json'
    if extensions.exists():
        extra=json.loads(extensions.read_text())
        for r in extra['newDefinitions']:
            bucket='templates' if r['Path'].startswith(TP+'/') else 'renderings' if r['Path'].startswith(RP+'/') else 'presentation'
            assert not any(x['ID']==r['ID'] for _,x in RECORDS),'Duplicate extension identity: '+r['Path']
            RECORDS.append((bucket,r))
        for update in extra['boundedPlaceholderUpdates']:
            r=next(r for _,r in RECORDS if r['ID']==update['id'])
            for group in [r.get('SharedFields',[]),r['Languages'][0].get('Fields',[]),r['Languages'][0]['Versions'][0]['Fields']]:
                for f in group:
                    if f['Hint'] in update['fields']:f['Value']=update['fields'][f['Hint']]
        TEMPLATES.update(extra['templateIds']);FIELDS.update(extra['fieldIds']);RENDERINGS.update(extra['renderingIds'])
        for r in extra['newDefinitions']:
            prefix=SITE+'/Presentation/Headless Variants/'
            if r['Template']==T['variant'] and r['Path'].startswith(prefix):VARIANTS[r['Path'][len(prefix):].replace('/','.')]=r['ID']
    editorial=BASE/'public-editorial-records.json'
    if include_editorial and editorial.exists():
        records=json.loads(editorial.read_text())['records']
        bypath={r['Path']:(n,b,r) for n,(b,r) in enumerate(RECORDS)}
        for r in records:
            if r['Path'] in bypath:
                n,b,old=bypath[r['Path']];assert old['ID']==r['ID'],'Editorial identity must be preserved.'
                RECORDS[n]=(b,r)
            else:RECORDS.append(('partial-content' if '/Presentation/Partial Designs/' in r['Path'] else 'content',r))

def outputs():
    build(); result={}; seen=set()
    for bucket,r in RECORDS:
        assert r["ID"] not in seen,"Duplicate generated ID: "+r["Path"];seen.add(r["ID"])
        prefix={"templates":TP,"renderings":RP,"placeholders":PP,"site":SITE,"content":SITE,"presentation":SITE+"/Presentation","partial-content":SITE+"/Presentation","branch":SITE+"/Presentation/Page Branches"}[bucket]
        relative=r["Path"][len(prefix):].lstrip("/") or prefix.rsplit("/",1)[-1]
        result[BASE/"items"/bucket/(relative.replace("$","#")+".yml")]=serialize(r)
    # Narrow module ownership; editorial/branch seed modules are never normal
    # resource-package deploy inputs. Each include has one source writer.
    def inc(name,path,ops="CreateAndUpdate",scope=None,rules=None):
        x={"name":name,"path":path,"allowedPushOperations":ops}
        if scope:x["scope"]=scope
        if rules:x["rules"]=rules
        return x
    modules={
      "LibertyMutual.PublicModel":[inc("templates",TP),inc("renderings",RP),inc("placeholders",PP)],
      "LibertyMutual.PublicPresentation":[inc("presentation",SITE+"/Presentation",rules=[{"path":"/Page Branches","scope":"Ignored"},{"path":"/Partial Designs/Header/Data","scope":"Ignored"},{"path":"/Partial Designs/Footer/Data","scope":"Ignored"},{"path":"/Placeholder Settings/Partial Design","scope":"Ignored"}]),inc("branch-settings",SITE+"/Presentation/Page Branches","CreateAndUpdate","SingleItem")],
      "LibertyMutual.PublicPartialPlaceholders":[inc('partial-'+label.lower().replace(' ','-'),SITE+'/Presentation/Placeholder Settings/Partial Design/'+label,'CreateAndUpdate','SingleItem') for label in ['Header','Page body','Footer']],
      "LibertyMutual.PublicSiteSeed":[inc("settings",SITE+"/Settings","CreateOnly","DescendantsOnly")],
      "LibertyMutual.PublicBootstrap":[inc("bootstrap-site",SITE,"CreateAndUpdate","SingleItem"),inc("bootstrap-settings",SITE+"/Settings","CreateAndUpdate","SingleItem"),inc("bootstrap-home",SITE+"/Home","CreateAndUpdate","SingleItem")],
      "LibertyMutual.PublicContentSeed":[inc("home",SITE+"/Home","CreateOnly","DescendantsOnly"),inc("data",SITE+"/Data","CreateOnly"),inc("header",SITE+"/Presentation/Partial Designs/Header/Data","CreateOnly"),inc("footer",SITE+"/Presentation/Partial Designs/Footer/Data","CreateOnly")],
      "LibertyMutual.PublicBranchSeed":[inc("branch",SITE+"/Presentation/Page Branches","CreateOnly","DescendantsOnly")],
    }
    # Use SCS's per-include directory convention. Move generated records into
    # those directories; path matching determines ownership, not a broad glob.
    out={}
    for namespace,includes in modules.items():
        for include in includes:
            for bucket,r in RECORDS:
                p=include["path"]; path=r["Path"]
                if path!=p and not path.startswith(p+"/"):continue
                if include.get("scope")=="SingleItem" and path!=p:continue
                if include.get("scope")=="DescendantsOnly" and path==p:continue
                if any(path==p+rule["path"] or path.startswith(p+rule["path"]+"/") for rule in include.get("rules",[])):continue
                rel=path[len(p):].lstrip("/")
                dest=BASE/"items"/include["name"]/(p.rsplit("/",1)[-1]+("/"+rel if rel else ""))
                dest=Path(str(dest).replace("$","#")+".yml")
                assert dest not in out,"Duplicate output owner: "+str(dest)
                out[dest]=serialize(r)
        module={"$schema":"../../../.sitecore/schemas/ModuleFile.schema.json","namespace":namespace,"description":"Public website "+("editable seed; explicit CreateOnly push only" if "Seed" in namespace else "developer-owned definitions; preserves editorial content"),"items":{"includes":includes}}
        out[BASE/(namespace+".module.json")]=json.dumps(module,indent=2)+"\n"
    assert sum(p.suffix==".yml" for p in out)==len(RECORDS),"Unowned or multiply owned native items"
    manifest={"schemaVersion":1,"siteName":"liberty-mutual-public-site","sitePath":SITE,"workflow":{"id":I["pageWorkflow"],"draft":I["pageDraft"],"awaitingApproval":"2598d5b1-953b-57ec-9086-14afb798ab06","approved":"44581197-9864-590b-92eb-6d620f36fbe1"},"namespace":str(NS),"ownership":{"model":"developer","presentation":"developer excluding local Data and page branches","seed":"editorial CreateOnly, never ordinary deploy","sharedDisclosure":"public-owned, consumed read-only by portal"},"siteId":uid(SITE),"homeId":uid(SITE+"/Home"),"bundlingId":uid(SITE+"/Home/bundling"),"promotionId":uid(SITE+"/Data/Promotions/Bundle and save"),"disclosureId":uid(SITE+"/Data/Disclosures/Product availability notice"),"templateIds":TEMPLATES,"fieldIds":FIELDS,"renderingIds":RENDERINGS,"variantIds":VARIANTS,"placeholders":{"headless-header":["PublicHeader"],"headless-main":["PublicPageBody"],"headless-footer":["PublicFooter"],"headless-public-hero-{*}":["PublicHero"],"headless-public-content-{*}":["PublicArticle","PublicImage","PublicCta","PublicPromotion","SharedDisclosure","PublicApprovedAnswer"]},"records":[{"id":r["ID"],"path":r["Path"],"parent":r["Parent"],"template":r["Template"],"bucket":b,"fields":{f["Hint"]:f["Value"] for f in [*r.get("SharedFields",[]),*r["Languages"][0].get("Fields",[]),*r["Languages"][0]["Versions"][0]["Fields"]]}} for b,r in RECORDS]}
    if (BASE/'public-model-extensions.json').exists():
        manifest['placeholders']['headless-public-hero-{*}']=['PublicHero','PublicBreadcrumbs']
        manifest['placeholders']['headless-public-content-{*}'] += ['PublicSearch','PublicProductSelector','PublicQuoteHandoff','PublicSection','PublicSplitContent','PublicFaq']
    out[BASE/"public-contract.json"]=json.dumps(manifest,indent=2)+"\n"
    return out
class Dumper(yaml.SafeDumper):pass
def represent(dumper,value):return dumper.represent_scalar("tag:yaml.org,2002:str",value,style="|" if "\n" in value else '"' if value=="" else None)
Dumper.add_representer(str,represent)
def serialize(value):
    # SCS's field formatters compare their canonical disk representation, not
    # only the stored field value. A native pull writes multivalue GUID fields
    # on separate lines. Preserve that representation so an unchanged native
    # model does not receive a needless update on every deployment.
    value=copy.deepcopy(value)
    if not value.get('SharedFields'):value.pop('SharedFields',None)
    if value.get('Languages'):
        ordered=[]
        for language in value['Languages']:
            if not language.get('Fields'):language.pop('Fields',None)
            ordered.append({key:language[key] for key in ['Language','Fields','Versions'] if key in language})
        value['Languages']=ordered
    format_file=BASE/'public-serialization-formats.json'
    native_formats=json.loads(format_file.read_text()).get(value.get('Path'),{}) if format_file.exists() else {}
    def canonical_fields(node):
        if isinstance(node,list):
            for child in node:canonical_fields(child)
        elif isinstance(node,dict):
            if 'Hint' in node and isinstance(node.get('Value'),str):
                v=node['Value']
                native=native_formats.get(node['Hint'])
                if native and v==native['semanticValue']:
                    node['Value']=native['serializedValue']
                elif node['Hint']!='PartialDesigns' and re.fullmatch(r'\{[A-Fa-f0-9-]{36}\}(?:\|\{[A-Fa-f0-9-]{36}\})+',v):
                    node['Value']=v.replace('|','\n')+'\n'
                elif node['Hint']=='__Renderings':
                    empty=re.fullmatch(r'<r><d id="([^"]+)" l="([^"]+)"></d></r>',v)
                    if empty:
                        node['Value']='<r>\n  <d\n    id="'+empty[1]+'"\n    l="'+empty[2]+'"></d>\n</r>\n'
            for child in node.values():canonical_fields(child)
    canonical_fields(value)
    text=yaml.dump(value,Dumper=Dumper,sort_keys=False,allow_unicode=True,width=100000).replace(": |-\n",": |\n")
    text=re.sub(r"(?m)^(\s*(?:- )?[^:\n]+: )('.*')$",lambda m:m.group(1)+json.dumps(yaml.safe_load(m.group(2)),ensure_ascii=False),text)
    # SCS's value reader can retain a quoted empty scalar as literal quotes.
    # An empty literal block expresses an actual empty string unambiguously.
    text=re.sub(r'(?m)^(\s*)Value: ""$',lambda m:m.group(1)+'Value: |\n',text)
    text=re.sub(r'(Value: \|\n)\n+\Z',r'\1',text)
    return "---\n"+text
def main():
    parser=argparse.ArgumentParser();parser.add_argument("--check",action="store_true");args=parser.parse_args()
    expected=outputs()
    # Workflow source has its own module/writer and must never be regenerated
    # or removed by this public presentation/content generator.
    stale={p for p in (BASE/"items").rglob("*.yml") if p.relative_to(BASE/"items").parts[0]!="workflow" and not p.relative_to(BASE/"items").parts[0].startswith('portal-relevance-')}-set(expected)
    if args.check:
        drift=[str(p.relative_to(ROOT)) for p,text in expected.items() if not p.exists() or p.read_text()!=text]
        if drift or stale:raise SystemExit("Generated public model drift: "+", ".join(drift[:10]+[str(p.relative_to(ROOT)) for p in stale]))
        print(f"Verified {len(expected)} public model/seed files; no writes.")
    else:
        for p in stale:p.unlink()
        for p,text in expected.items():p.parent.mkdir(parents=True,exist_ok=True);p.write_text(text)
        for p in sorted((BASE/'items').rglob('*'),key=lambda p:len(p.parts),reverse=True):
            if p.is_dir() and p.relative_to(BASE/'items').parts[0]!='workflow' and not p.relative_to(BASE/'items').parts[0].startswith('portal-relevance-') and not any(p.iterdir()):p.rmdir()
        print(f"Prepared {len(expected)} public model/seed files. No Sitecore operations.")
if __name__=="__main__":main()
