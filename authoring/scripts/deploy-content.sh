#!/usr/bin/env bash
# Scoped, non-deleting model release. Seeds and publication are explicit options.
set -euo pipefail
if [[ $# -lt 1 || "$1" == "--help" ]]; then
  echo 'Usage: authoring/scripts/deploy-content.sh ENVIRONMENT [--seed] [--publish] [--what-if]'
  echo 'Normal release updates LibertyMutual.Model and LibertyMutual.SitePresentation. --seed creates missing editorial items only.'
  exit 0
fi
portal_environment="$1"
shift
portal_seed=false
portal_publish=false
portal_what_if=false
for portal_option in "$@"; do
  case "$portal_option" in
    --seed) portal_seed=true ;;
    --publish) portal_publish=true ;;
    --what-if) portal_what_if=true ;;
    *) echo "Unknown option: $portal_option" >&2; exit 2 ;;
  esac
done
portal_repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$portal_repo_root"
dotnet sitecore ser validate -i LibertyMutual.Model -i LibertyMutual.Content -i LibertyMutual.SitePresentation
if [[ "$portal_what_if" == true ]]; then
  dotnet sitecore ser push -n "$portal_environment" -i LibertyMutual.Model --what-if
else
  dotnet sitecore ser push -n "$portal_environment" -i LibertyMutual.Model
fi
if [[ "$portal_seed" == true ]]; then
  python3 - <<'PY'
import json
from pathlib import Path
p=Path('authoring/items/liberty-mutual/LibertyMutual.Content.module.json')
d=json.loads(p.read_text())
keys=['headless-agent-guidance','headless-resource-search','headless-resource-article','headless-products-spotlight']
expected=[{'path':'/liberty-mutual-agent-portal/Presentation/Placeholder Settings/'+key,'scope':'Ignored'} for key in sorted(keys)]
if len(d['items']['includes'])!=1:
    raise SystemExit('Refusing seed push: expected one owned content include.')
for include in d['items']['includes']:
    if (include['path']!='/sitecore/content/LibertyMutual' or include['allowedPushOperations']!='CreateOnly'
            or sorted(include.get('rules',[]),key=lambda rule:rule['path'])!=expected):
        raise SystemExit('Refusing seed push: content must remain CreateOnly with only the four model-owned site placeholder exclusions.')
PY
  if [[ "$portal_what_if" == true ]]; then
    dotnet sitecore ser push -n "$portal_environment" -i LibertyMutual.Content --what-if
  else
    dotnet sitecore ser push -n "$portal_environment" -i LibertyMutual.Content
  fi
fi
# Site-specific restrictions need their Presentation parent. On a new target,
# the optional CreateOnly content seed above creates that folder first.
if [[ "$portal_what_if" == true ]]; then
  dotnet sitecore ser push -n "$portal_environment" -i LibertyMutual.SitePresentation --what-if
else
  dotnet sitecore ser push -n "$portal_environment" -i LibertyMutual.SitePresentation
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
