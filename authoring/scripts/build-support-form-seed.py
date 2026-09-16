#!/usr/bin/env python3
"""Generate/check only the three Support native Form placement definitions."""
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
spec = importlib.util.spec_from_file_location('support_form_helpers', Path(__file__).with_name('build-product-spotlight-seed.py'))
helpers = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helpers)
def generate(check=False):
    contract = json.loads(subprocess.check_output(['node', 'authoring/scripts/support-native-form-model.cjs'], cwd=ROOT, text=True))
    includes = []
    for record in contract['model']:
        name = {'SupportLayout': 'support-form-layout', 'headless-support-form': 'support-form-site' if record['Path'].startswith(contract['SP']) else 'support-form-placeholder'}[record['Path'].rsplit('/', 1)[1]]
        target = BASE / 'items' / name / (record['Path'].rsplit('/', 1)[1] + '.yml')
        includes.append({'name': name, 'path': record['Path'], 'scope': 'SingleItem', 'allowedPushOperations': 'CreateAndUpdate'})
        if target.exists():
            if yaml.safe_load(target.read_text(encoding='utf-8-sig')) != record:
                raise ValueError('Support Form model differs; review before replacing: ' + str(target))
        elif check:
            raise ValueError('Missing Support Form model: ' + str(target))
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(helpers.serialize(record))
    module = {'$schema': '../../../.sitecore/schemas/ModuleFile.schema.json', 'namespace': 'LibertyMutual.SupportForm', 'description': 'Three exact developer-owned Support layout and placeholder definitions. No native Form definition, webhook, or page content.', 'items': {'includes': includes}}
    target = BASE / 'LibertyMutual.SupportForm.module.json'
    if check:
        if json.loads(target.read_text()) != module:
            raise ValueError('SupportForm module scope differs.')
    else:
        target.write_text(json.dumps(module, indent=2) + '\n')
    print('Validated three Support native Form placement items; no form definition or page content is serialized.')
if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    generate(parser.parse_args().check)
