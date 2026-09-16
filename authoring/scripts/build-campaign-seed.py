#!/usr/bin/env python3
"""Build additive campaign model/blank branch only. Never serialize live campaigns.

--check verifies files without writing. Existing authored/native files are never
overwritten. Use seed-campaign-content.cjs for create-only editable page content.
"""
from pathlib import Path
import argparse
import importlib.util
import json
import subprocess
import sys
import yaml

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / 'authoring/items/liberty-mutual'
sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('campaign_helpers', Path(__file__).with_name('build-product-spotlight-seed.py'))
helpers = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helpers)


def generate(check=False):
    model = json.loads(subprocess.check_output(['node', 'authoring/scripts/campaign-authoring-model.cjs'], cwd=ROOT, text=True))
    files = []
    for record in model['model'] + model['branch']:
        path = record['Path']
        if path.startswith(model['BRANCH']):
            target = BASE / 'items/campaign-page-branch' / ('Campaign page' + path[len(model['BRANCH']):].replace('$', '#') + '.yml')
        elif path.startswith(model['SP'] + '/'):
            key = path.rsplit('/', 1)[1]
            target = BASE / ('items/site-' + key.removeprefix('headless-')) / (key + '.yml')
        else:
            target = helpers.file_for(record)
        files.append(str(target.relative_to(ROOT)))
        if target.exists():
            existing = yaml.safe_load(target.read_text(encoding='utf-8-sig'))
            # Normalize native empty field syntax for comparison.
            def normalize(value):
                if isinstance(value, dict):
                    return {k: '' if k == 'Value' and v is None else normalize(v) for k, v in value.items()}
                if isinstance(value, list):
                    return [normalize(v) for v in value]
                return value
            if normalize(existing) != normalize(record):
                raise ValueError('Existing campaign model differs; preserve and review: ' + str(target))
        elif check:
            raise ValueError('Missing model item: ' + str(target))
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(helpers.serialize(record))
    contract = {k: model[k] for k in ['SITE','TP','RP','LP','PP','SP','BRANCH','GROWTH','PAGE','PRACTICE','IDS','F','COMPONENTS','PLACEHOLDERS','instances','CONTENT','CREATED','branchRule']}
    contract.update(schemaVersion=1, generatedFiles=files,
                    modelIds={record['Path']:record['ID'] for record in model['model'] + model['branch']},
                    contentPolicy='Live and practice campaign content is created through Authoring API only; never deployed as item resources.')
    out = BASE / 'campaign-authoring-manifest.json'
    if check:
        if not out.exists() or json.loads(out.read_text()) != contract:
            raise ValueError('Campaign manifest differs from declared model.')
    else:
        out.write_text(json.dumps(contract, indent=2) + '\n')
    print(f'Validated {len(files)} additive campaign model and blank branch items. No live page content is serialized.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    generate(parser.parse_args().check)
