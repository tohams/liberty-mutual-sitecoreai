#!/usr/bin/env bash
# Scoped, non-deleting model release. Seeds and publication are explicit options.
set -euo pipefail
if [[ $# -lt 1 || "$1" == "--help" ]]; then
  echo 'Usage: authoring/scripts/deploy-content.sh ENVIRONMENT [--seed | --seed-taxonomy | --seed-branch | --seed-products] [--publish] [--what-if]'
  echo 'Normal release updates Model, SitePresentation, SupportForm, and ComponentLibrary only. --seed creates missing editorial, taxonomy, product reference, and branch items; --seed-taxonomy creates missing metadata lists; --seed-branch creates the missing Resource page branch; --seed-products creates missing product references and the Product page branch.'
  exit 0
fi
portal_environment="$1"
shift
portal_seed=false
portal_seed_taxonomy=false
portal_seed_branch=false
portal_seed_products=false
portal_publish=false
portal_what_if=false
for portal_option in "$@"; do
  case "$portal_option" in
    --seed) portal_seed=true; portal_seed_taxonomy=true; portal_seed_branch=true; portal_seed_products=true ;;
    --seed-taxonomy) portal_seed_taxonomy=true ;;
    --seed-branch) portal_seed_branch=true ;;
    --seed-products) portal_seed_products=true ;;
    --publish) portal_publish=true ;;
    --what-if) portal_what_if=true ;;
    *) echo "Unknown option: $portal_option" >&2; exit 2 ;;
  esac
done
portal_repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$portal_repo_root"
# Check seed boundaries before the first native operation, including model push.
python3 - <<'PY'
import json
from pathlib import Path
base=Path('authoring/items/liberty-mutual')
d=json.loads((base/'LibertyMutual.Content.module.json').read_text())
keys=['headless-agent-guidance','headless-resource-search','headless-resource-article','headless-products-spotlight','headless-resource-image','headless-campaign-page','headless-campaign-hero','headless-campaign-main','headless-campaign-sidebar','headless-support-form','headless-product-details']
expected=[{'path':'/liberty-mutual-agent-portal/Presentation/Placeholder Settings/'+key,'scope':'Ignored'} for key in keys]
expected.append({'path':'/liberty-mutual-agent-portal/Data/Taxonomy','scope':'Ignored'})
expected.append({'path':'/liberty-mutual-agent-portal/Presentation/Page Branches/Resource page','scope':'Ignored'})
expected.append({'path':'/liberty-mutual-agent-portal/Presentation/Page Branches/Campaign page','scope':'Ignored'})
expected.append({'path':'/liberty-mutual-agent-portal/Presentation/Page Branches/Product page','scope':'Ignored'})
expected.append({'path':'/liberty-mutual-agent-portal/Data/ProductCatalog','scope':'Ignored'})
expected.extend({'path':'/liberty-mutual-agent-portal/Home/growth/'+slug,'scope':'Ignored'} for slug in ['small-business','campaign-practice','campaign-schedule-check'])
available='/sitecore/content/LibertyMutual/liberty-mutual-agent-portal/Presentation/Available Renderings'
expected.append({'path':available.removeprefix('/sitecore/content/LibertyMutual'),'scope':'Ignored'})
expected.sort(key=lambda rule:rule['path'])
core_groups=['FEaaS','Forms','Media','Navigation','Page Content','Page Structure']
expected_core=[{'name':'library-seed-'+name.lower().replace(' ','-'),'path':available+'/'+name,'scope':'SingleItem','allowedPushOperations':'CreateOnly'} for name in core_groups]
if len(d['items']['includes'])!=1:
    raise SystemExit('Refusing seed push: expected one owned content include.')
library_seed=json.loads((base/'LibertyMutual.LibrarySeed.module.json').read_text())
if library_seed['items']['includes']!=expected_core:
    raise SystemExit('Refusing library seed: expected six exact CreateOnly native library groups.')
for include in d['items']['includes']:
    if (include['path']!='/sitecore/content/LibertyMutual' or include['allowedPushOperations']!='CreateOnly'
            or include.get('scope','ItemAndDescendants')!='ItemAndDescendants'
            or sorted(include.get('rules',[]),key=lambda rule:rule['path'])!=expected):
        raise SystemExit('Refusing seed push: content must remain CreateOnly with exact site placeholder, taxonomy, branch and API-owned campaign exclusions.')
taxonomy=json.loads((base/'LibertyMutual.Taxonomy.module.json').read_text())
includes=taxonomy['items']['includes']
if (len(includes)!=1 or includes[0]['path']!='/sitecore/content/LibertyMutual/liberty-mutual-agent-portal/Data/Taxonomy'
        or includes[0].get('allowedPushOperations')!='CreateOnly'
        or includes[0].get('scope','ItemAndDescendants')!='ItemAndDescendants'
        or includes[0].get('rules')):
    raise SystemExit('Refusing taxonomy seed: expected only the owned CreateOnly Taxonomy subtree.')
branch=json.loads((base/'LibertyMutual.ResourcePageBranch.module.json').read_text())
if branch['items']['includes']!=[{'name':'resource-page-branch','path':'/sitecore/content/LibertyMutual/liberty-mutual-agent-portal/Presentation/Page Branches/Resource page','allowedPushOperations':'CreateOnly'}]:
    raise SystemExit('Refusing branch seed: expected only the owned CreateOnly Resource page subtree.')
for namespace,name,suffix in [('ProductPageBranch','product-page-branch','/Presentation/Page Branches/Product page'),('ProductCatalog','product-catalog','/Data/ProductCatalog')]:
    module=json.loads((base/('LibertyMutual.'+namespace+'.module.json')).read_text())
    if module['items']['includes']!=[{'name':name,'path':'/sitecore/content/LibertyMutual/liberty-mutual-agent-portal'+suffix,'allowedPushOperations':'CreateOnly'}]:
        raise SystemExit('Refusing product seed: expected the exact owned CreateOnly product branch and reference subtrees.')
support=json.loads((base/'LibertyMutual.SupportForm.module.json').read_text())
expected_support=[
    {'name':'support-form-layout','path':'/sitecore/layout/Layouts/Project/LibertyMutual/SupportLayout','scope':'SingleItem','allowedPushOperations':'CreateAndUpdate'},
    {'name':'support-form-placeholder','path':'/sitecore/layout/Placeholder Settings/Project/LibertyMutual/headless-support-form','scope':'SingleItem','allowedPushOperations':'CreateAndUpdate'},
    {'name':'support-form-site','path':'/sitecore/content/LibertyMutual/liberty-mutual-agent-portal/Presentation/Placeholder Settings/headless-support-form','scope':'SingleItem','allowedPushOperations':'CreateAndUpdate'},
]
if support['items']['includes']!=expected_support:
    raise SystemExit('Refusing Support Form push: expected exactly three owned layout/placeholder definitions.')
library=json.loads((base/'LibertyMutual.ComponentLibrary.module.json').read_text())
expected_library=[{'name':'component-library-'+key,'path':available+suffix,'scope':'SingleItem','allowedPushOperations':'CreateAndUpdate'} for key,suffix in [('root',''),('campaign','/Campaign'),('resources','/Resources'),('agent-portal','/Agent portal')]]
if library['items']['includes']!=expected_library:
    raise SystemExit('Refusing Component Library push: expected exactly four owned SingleItem library configuration records.')
deployed=json.loads(Path('xmcloud.build.json').read_text())['deployItems']['modules']
if len(deployed)!=5 or set(deployed)!={'nextjs-starter','LibertyMutual.Model','LibertyMutual.SitePresentation','LibertyMutual.SupportForm','LibertyMutual.ComponentLibrary'}:
    raise SystemExit('Refusing deployment: editorial content, taxonomy and branches must remain outside authoring resource packages.')
PY
dotnet sitecore ser validate -i LibertyMutual.Model -i LibertyMutual.Content -i LibertyMutual.SitePresentation -i LibertyMutual.Taxonomy -i LibertyMutual.ResourcePageBranch -i LibertyMutual.ProductPageBranch -i LibertyMutual.ProductCatalog -i LibertyMutual.SupportForm -i LibertyMutual.ComponentLibrary -i LibertyMutual.LibrarySeed
if [[ "$portal_what_if" == true ]]; then
  dotnet sitecore ser push -n "$portal_environment" -i LibertyMutual.Model --what-if
else
  dotnet sitecore ser push -n "$portal_environment" -i LibertyMutual.Model
fi
if [[ "$portal_seed" == true ]]; then
  if [[ "$portal_what_if" == true ]]; then
    dotnet sitecore ser push -n "$portal_environment" -i LibertyMutual.Content --what-if
  else
    dotnet sitecore ser push -n "$portal_environment" -i LibertyMutual.Content
  fi
fi
# Taxonomy is authored content. Explicit seeding creates missing items only;
# ordinary releases never recreate an option that a marketer removed.
if [[ "$portal_seed_taxonomy" == true ]]; then
  if [[ "$portal_what_if" == true ]]; then
    dotnet sitecore ser push -n "$portal_environment" -i LibertyMutual.Taxonomy --what-if
  else
    dotnet sitecore ser push -n "$portal_environment" -i LibertyMutual.Taxonomy
  fi
fi
# A branch is editable authoring content. CreateOnly never resets a branch that
# marketing has customized. On a fresh site the content seed creates its parent.
if [[ "$portal_seed_branch" == true ]]; then
  if [[ "$portal_what_if" == true ]]; then
    dotnet sitecore ser push -n "$portal_environment" -i LibertyMutual.ResourcePageBranch --what-if
  else
    dotnet sitecore ser push -n "$portal_environment" -i LibertyMutual.ResourcePageBranch
  fi
fi
# Site-specific restrictions need their Presentation parent. On a new target,
# the optional CreateOnly content seed above creates that folder first.
if [[ "$portal_seed_products" == true ]]; then
  for portal_module in LibertyMutual.ProductCatalog LibertyMutual.ProductPageBranch; do
    if [[ "$portal_what_if" == true ]]; then
      dotnet sitecore ser push -n "$portal_environment" -i "$portal_module" --what-if
    else
      dotnet sitecore ser push -n "$portal_environment" -i "$portal_module"
    fi
  done
fi
if [[ "$portal_what_if" == true ]]; then
  dotnet sitecore ser push -n "$portal_environment" -i LibertyMutual.SitePresentation --what-if
else
  dotnet sitecore ser push -n "$portal_environment" -i LibertyMutual.SitePresentation
fi
# The native Form is provided by Sitecore; only Support layout/slots are pushed.
if [[ "$portal_what_if" == true ]]; then
  dotnet sitecore ser push -n "$portal_environment" -i LibertyMutual.SupportForm --what-if
else
  dotnet sitecore ser push -n "$portal_environment" -i LibertyMutual.SupportForm
fi
# Library sections are developer-owned configuration, never editorial pages.
if [[ "$portal_what_if" == true ]]; then
  dotnet sitecore ser push -n "$portal_environment" -i LibertyMutual.ComponentLibrary --what-if
else
  dotnet sitecore ser push -n "$portal_environment" -i LibertyMutual.ComponentLibrary
fi
# Preserve native groups; create missing ones only after the library parent exists.
if [[ "$portal_seed" == true ]]; then
  if [[ "$portal_what_if" == true ]]; then
    dotnet sitecore ser push -n "$portal_environment" -i LibertyMutual.LibrarySeed --what-if
  else
    dotnet sitecore ser push -n "$portal_environment" -i LibertyMutual.LibrarySeed
  fi
fi
if [[ "$portal_publish" == true && "$portal_what_if" == false ]]; then
  for portal_path in \
    '/sitecore/templates/Project/LibertyMutual' \
    '/sitecore/layout/Renderings/Project/LibertyMutual' \
    '/sitecore/layout/Layouts/Project/LibertyMutual' \
    '/sitecore/layout/Placeholder Settings/Project/LibertyMutual'; do
    dotnet sitecore publish item -n "$portal_environment" -p "$portal_path" -sub -l en --pt Edge
  done
  # The requested publication is strictly the owned customer site, with no related-items expansion.
  dotnet sitecore publish item -n "$portal_environment" \
    -p '/sitecore/content/LibertyMutual' -sub -l en --pt Edge
fi
