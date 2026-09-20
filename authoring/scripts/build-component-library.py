#!/usr/bin/env python3
"""Generate only component-library presentation metadata; never contact Sitecore.

Runtime rendering identities, datasource fields, and insertion rules are preserved.
The four library configuration records are developer-owned, SingleItem includes.
Other native library groups and editorial content are outside this module.
"""
from pathlib import Path
import argparse
import importlib.util
import json
import sys
import yaml

from component_library_model import MANIFEST, apply_rendering_metadata

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / 'authoring/items/liberty-mutual'
sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('library_seed_helpers', Path(__file__).with_name('build-product-spotlight-seed.py'))
helpers = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helpers)
field, brace = helpers.field, helpers.brace


def configuration_records():
    root, ids = MANIFEST['availableRoot'], MANIFEST['fields']
    records = [('component-library-root', {
        'ID': root['itemId'], 'Parent': root['parentId'], 'Template': root['templateId'], 'Path': root['path'],
        'SharedFields': [field(ids['group'], 'Group renderings in sections', '1')],
    })]
    for section in MANIFEST['sections']:
        records.append(('component-library-' + section['name'].lower().replace(' ', '-'), {
            'ID': section['itemId'], 'Parent': root['itemId'], 'Template': MANIFEST['sectionTemplateId'], 'Path': section['path'],
            'SharedFields': [
                field(ids['renderings'], 'Renderings', '|'.join(brace(MANIFEST['renderings'][name]['itemId']) for name in section['components'])),
                field(ids['sort'], '__Sortorder', section['sortOrder']),
            ],
            'Languages': [{'Language': 'en', 'Fields': [field(ids['display'], '__Display name', section['displayName'])], 'Versions': []}],
        }))
    return records


def generate(check=False):
    files = []
    for name, metadata in MANIFEST['renderings'].items():
        target = BASE / 'items/renderings/LibertyMutual' / (name + '.yml')
        before = yaml.safe_load(target.read_text(encoding='utf-8-sig'))
        after = apply_rendering_metadata(json.loads(json.dumps(before)))
        if check and before != after:
            raise ValueError('Component metadata differs: ' + name)
        if not check and before != after:
            target.write_text(helpers.serialize(after))
        files.append(str(target.relative_to(ROOT)))
    includes = []
    for include_name, record in configuration_records():
        target = BASE / 'items' / include_name / (record['Path'].rsplit('/', 1)[-1] + '.yml')
        includes.append({'name': include_name, 'path': record['Path'], 'scope': 'SingleItem', 'allowedPushOperations': 'CreateAndUpdate'})
        if check:
            if not target.exists() or yaml.safe_load(target.read_text(encoding='utf-8-sig')) != record:
                raise ValueError('Component library configuration differs: ' + str(target))
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(helpers.serialize(record))
        files.append(str(target.relative_to(ROOT)))
    module = {'$schema': '../../../.sitecore/schemas/ModuleFile.schema.json', 'namespace': 'LibertyMutual.ComponentLibrary',
              'description': 'Four exact developer-owned component-library configuration items. Only section grouping, membership, order, and English display names; no editorial content or other native groups.',
              'items': {'includes': includes}}
    target = BASE / 'LibertyMutual.ComponentLibrary.module.json'
    if check:
        if not target.exists() or json.loads(target.read_text()) != module:
            raise ValueError('Component library module differs from its exact owned items.')
    else:
        target.write_text(json.dumps(module, indent=2) + '\n')
    print(f'Checked {len(MANIFEST["renderings"])} rendering labels/icons and four bounded library configuration items. No native operations performed.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    generate(parser.parse_args().check)
