#!/usr/bin/env python3
"""Prepare a checksum-verified native-media upload inventory, without CMS writes.

The current source-fidelity manifest supersedes earlier rough product icons.
Existing real native bindings are preserved; no media or DAM IDs are invented.
"""
from pathlib import Path
import argparse, hashlib, json, re

ROOT=Path(__file__).resolve().parents[2]
APP=ROOT/'examples/liberty-mutual-public-site'
MEDIA='/sitecore/media library/Project/LibertyMutual/liberty-mutual-public-site'
CONSUMER_ALT={
    'product-auto':'Auto insurance','product-home':'Home insurance','product-condo':'Condo insurance',
    'product-renters':'Renters insurance','product-pet':'Pet insurance','product-motorcycle':'Motorcycle insurance',
    'product-life':'Life insurance','product-small-business':'Small business insurance',
    'logo-header':'Liberty Mutual Insurance','logo-footer-vertical':'Liberty Mutual Insurance',
    'logo-footer-medallion':'Liberty Mutual Insurance','liberty-mutual-logo':'Liberty Mutual Insurance',
}
def consumer_alt(key,source):
    value=CONSUMER_ALT.get(key,source.get('alt',''))
    assert isinstance(value,str) and value.strip(),'An explicit visitor-facing alt is required: '+key
    assert not re.search(r'actual rendered|standalone fill|intrinsic dimensions|original svg|implementation',value,re.I),'Internal asset provenance is not alternative text: '+key
    return value

def refs(value,trail='',result=None):
    result={} if result is None else result
    if isinstance(value,dict):
        if value.get('assetKey'):result.setdefault(value['assetKey'],[]).append(trail)
        for key,child in value.items():refs(child,trail+'/'+str(key),result)
    elif isinstance(value,list):
        for key,child in enumerate(value):refs(child,trail+'/'+str(key),result)
    return result

def main():
    p=argparse.ArgumentParser()
    p.add_argument('--editorial',type=Path,required=True)
    p.add_argument('--composition',type=Path,required=True)
    p.add_argument('--home-image',type=Path,required=True)
    p.add_argument('--logo-journal',type=Path,required=True)
    p.add_argument('--logo-assets',type=Path)
    p.add_argument('--output',type=Path,required=True)
    a=p.parse_args()
    assert all(f.is_absolute() for f in vars(a).values() if f is not None)
    assert not a.output.is_relative_to(ROOT) and not a.output.exists(),'Use a new private output outside source.'
    manifest=json.loads((APP/'asset-sources.json').read_text())
    uses=refs(json.loads(a.editorial.read_text()),'editorial')
    refs(json.loads(a.composition.read_text()),'fidelity',uses)
    assets={}
    for source in manifest['assets']:
        if not source['file'].startswith(('/images/','/brand/')):continue
        key=Path(source['file']).stem
        assets[key]={**source,'key':key,'file':'public'+source['file'],'sourceUrl':source['source'],'alt':'Liberty Mutual' if key=='liberty-mutual-logo' else source['description']}
    for source in [*manifest['additionalAssetsPrepared'],*manifest['fidelityAssets']]:
        assets[source['key']]=source
    if a.logo_assets:
        for source in json.loads(a.logo_assets.read_text()):
            assert source['key'] in ['logo-header','logo-footer-vertical','logo-footer-medallion']
            assets[source['key']]=source
            uses[source['key']]=['Header/logo' if source['key']=='logo-header' else 'Footer/mobileLogo' if source['key']=='logo-footer-medallion' else 'Footer/logo']
    # All eight selector icons are native shared product-option images, even
    # where a selector's ordered native references do not repeat asset keys.
    for key in assets:
        if key.startswith('product-'):uses.setdefault(key,[]).append('shared native Product options')
    uses.setdefault('liberty-mutual-logo',[]).append('Historical slice binding only; new fidelity versions use the three source-faithful logos.' if a.logo_assets else 'shared Header/logo and Footer/logo')
    home=json.loads(a.home_image.read_text())
    home_xml=next(f['value'] for f in home['fields'] if f['name']=='image')
    assert home['path'].endswith('/Home/Data/Hero') and 'dam-id=' in home_xml,'Real Page Builder MML field required.'
    logo=json.loads(a.logo_journal.read_text())
    logo_id=logo['item']['itemId'];logo_xml=logo['imageField']
    assert re.fullmatch(r'[A-Fa-f0-9-]{32,36}',logo_id) and 'mediaid=' in logo_xml
    missing=set(uses)-set(assets);assert not missing,'Missing source assets: '+str(sorted(missing))
    inventory=[]
    for key in sorted(uses):
        source=assets[key];supplied=Path(source['file']);file=supplied if supplied.is_absolute() else APP/supplied
        assert file.is_file() and (file.is_relative_to(APP) or (a.logo_assets and source['key'].startswith('logo-') and file.parent==a.logo_assets.parent))
        data=file.read_bytes();sha=hashlib.sha256(data).hexdigest()
        assert not source.get('sha256') or sha==source['sha256'],'Current source checksum mismatch: '+key
        assert not source.get('bytes') or len(data)==source['bytes'],'Current source size mismatch: '+key
        existing=home_xml if key=='family-basketball' else logo_xml if key=='liberty-mutual-logo' else None
        inventory.append({'key':key,'file':str(file),'sha256':sha,'bytes':len(data),'sourceUrl':source.get('sourceUrl',source.get('source')),'referencePage':source.get('referencePage'),'alt':consumer_alt(key,source),'usedBy':uses[key],
          'nativeMediaPath':MEDIA+'/'+('Liberty Mutual logo' if key=='liberty-mutual-logo' else key.replace('-',' ')),
          'action':'preserve-existing-native-binding' if existing else 'upload-new-native-media',
          'existingMediaItemId':logo_id if key=='liberty-mutual-logo' else None,
          'existingImageField':existing})
    a.output.parent.mkdir(parents=True,exist_ok=True)
    a.output.write_text(json.dumps({'schemaVersion':1,'status':'Prepared offline; new uploads are not yet created.','assets':inventory,'totals':{'requiredAssets':len(inventory),'preservedBindings':sum(bool(x['existingImageField']) for x in inventory),'newUploads':sum(x['action']=='upload-new-native-media' for x in inventory)},'bindingRule':'Bind SDK Image fields only to actual upload-returned MediaIDs or the preserved real MML field. Never substitute source-only XML or invented DAM IDs.'},indent=2)+'\n')
    a.output.chmod(0o600)
    print(json.dumps({'inventory':str(a.output),'assets':len(inventory),'newUploads':sum(x['action']=='upload-new-native-media' for x in inventory),'preservedBindings':2}))

if __name__=='__main__':main()
