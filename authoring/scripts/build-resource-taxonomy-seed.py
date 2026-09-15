#!/usr/bin/env python3
"""Create the managed resource metadata lists without changing existing content.

The source is authoring/items/liberty-mutual/resource-taxonomy.json. This additive
generator owns only ResourceMetadataOption / ResourceMetadataFolder templates,
their CreateOnly taxonomy seed, an isolated serialization module, and a manifest.
It never rewrites existing files, connects to Sitecore, pushes or publishes.
Use --check to verify these files without writing. Model field Type / Source
changes are intentionally separate so their Search compatibility can be checked.
"""

import argparse
import json
from pathlib import Path
import re
import uuid

import yaml


ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / 'authoring/items/liberty-mutual'
ITEMS = BASE / 'items'
CONFIG = BASE / 'resource-taxonomy.json'
NAMESPACE = uuid.UUID('4a098fe0-ad6b-4722-9862-4e56b855337a')
SITE = '/sitecore/content/LibertyMutual/liberty-mutual-agent-portal'
TAXONOMY = SITE + '/Data/Taxonomy'
MODEL = '/sitecore/templates/Project/LibertyMutual'
OPTION = MODEL + '/ResourceMetadataOption'
FOLDER = MODEL + '/ResourceMetadataFolder'
CREATED = '20260914T000000Z'

IDS = {
    'template': 'ab86861a-6030-46c5-b394-e8f99e8b87db',
    'section': 'e269fbb5-3750-427a-9149-7aa950b49301',
    'field': '455a3e98-a627-4b40-8035-e683a0331ac7',
    'folder': 'a87a00b1-e6db-45ab-8b54-636fec3b5523',
    'standard': '1930bbeb-7805-471a-a3be-4858ac7cf696',
    'project': '94b480f8-5b0a-4487-99bb-238569489481',
    'data': '20e904a1-9b60-43a1-a8d0-8e3aee45b115',
}
FIELDS = {
    'base': '12c33f3f-86c5-43a5-aeb4-5598cec45116',
    'standard': 'f7d48a55-2158-4f02-9356-756654404f73',
    'sort': 'ba3f86a2-4a1c-4d78-b63d-91c2779c1b5e',
    'icon': '06d5295c-ed2f-4a54-9bf2-26228d113318',
    'insert': '1172f251-dad4-4efb-a329-0c63500e4f1e',
    'display': 'b5e02ad9-d56f-4c41-a065-a133db87bdeb',
    'help': '9541e67d-ce8c-4225-803d-33f7f29f09ef',
    'title': '19a69332-a23e-4e70-8d16-b2640cb24cc8',
    'type': 'ab162cc0-dc80-4abf-8871-998ee5d7ba32',
    'created': '25bed78c-4957-4165-998a-ca1b52f67497',
}
EXPECTED_FIELDS = ['state', 'businessFamily', 'product', 'channel', 'resourceType']


def uid(key):
    return str(uuid.uuid5(NAMESPACE, key))


def brace(identifier):
    return '{' + identifier.upper() + '}'


def field(identifier, hint, value):
    return {'ID': identifier, 'Hint': hint, 'Value': str(value)}


def item(path, parent, template, shared=None, language_fields=None, values=None, identifier=None):
    result = {'ID': identifier or uid(path), 'Parent': parent, 'Template': template, 'Path': path}
    if shared:
        result['SharedFields'] = shared
    language = {'Language': 'en'}
    if language_fields:
        language['Fields'] = language_fields
    language['Versions'] = [{'Version': 1, 'Fields': values or [
        field(FIELDS['created'], '__Created', CREATED),
    ]}]
    result['Languages'] = [language]
    return result


class Dumper(yaml.SafeDumper):
    pass


def represent_string(dumper, value):
    return dumper.represent_scalar('tag:yaml.org,2002:str', value,
                                  style='|' if '\n' in value else '"' if value == '' else None)


Dumper.add_representer(str, represent_string)


def serialize(value):
    serialized = yaml.dump(value, Dumper=Dumper, sort_keys=False, allow_unicode=True, width=100000)
    serialized = serialized.replace(': |-\n', ': |\n')
    serialized = re.sub(r"(?m)^(\s*(?:- )?[^:\n]+: )('.*')$",
                        lambda match: match.group(1) + json.dumps(yaml.safe_load(match.group(2)), ensure_ascii=False),
                        serialized)
    serialized = re.sub(r'(?m)^(\s*Value:) ""$', r'\1', serialized)
    return '---\n' + serialized


def file_for(record):
    path = record['Path']
    if path == OPTION or path.startswith(OPTION + '/') or path == FOLDER or path.startswith(FOLDER + '/'):
        return ITEMS / 'templates' / (path.removeprefix('/sitecore/templates/Project/') + '.yml')
    if path == TAXONOMY or path.startswith(TAXONOMY + '/'):
        return ITEMS / 'taxonomy' / (path.removeprefix(SITE + '/Data/') + '.yml')
    raise ValueError('Taxonomy generation cannot write outside its owned roots.')


def load_configuration():
    config = json.loads(CONFIG.read_text())
    if config.get('schemaVersion') != '1.0.0' or config.get('site') != SITE or config.get('root') != TAXONOMY:
        raise ValueError('Unexpected taxonomy source schema or root.')
    taxonomies = config.get('taxonomies', [])
    if [entry.get('field') for entry in taxonomies] != EXPECTED_FIELDS:
        raise ValueError('Expected the five resource metadata taxonomies in their documented order.')
    folders = set()
    for entry in taxonomies:
        folder = entry['folder']
        if not folder or '/' in folder or folder.casefold() in folders:
            raise ValueError('Taxonomy folders must have unique, single-level names.')
        folders.add(folder.casefold())
        names = set()
        for option in entry['options']:
            name = option['name']
            if not name or any(character in name for character in '/\\|{}') or name.casefold() in names:
                raise ValueError('Taxonomy options must have unique stable item names within their folder.')
            if not option.get('displayName') or not option.get('description'):
                raise ValueError('Taxonomy options need a readable display name and description.')
            names.add(name.casefold())
    # Every original value must still be selectable. Extra supported options are
    # permitted, but deleting or renaming a code requires an explicit migration.
    resources = json.loads((ROOT / 'docs/brand/portal-content-seeds.json').read_text())['resources']
    keys = {'state': 'states', 'businessFamily': 'family', 'product': 'product',
            'channel': 'channel', 'resourceType': 'resourceType'}
    for entry in taxonomies:
        expected = set()
        for resource in resources:
            value = resource[keys[entry['field']]]
            expected.add(value[0] if isinstance(value, list) and len(value) == 1 else
                         'All' if isinstance(value, list) else value)
        available = {option['name'] for option in entry['options']}
        if not expected <= available:
            raise ValueError('Missing original resource codes for ' + entry['field'] + ': ' + ', '.join(sorted(expected - available)))
    return config


def build_items(config):
    records = []
    for path, base, icon in [(OPTION, IDS['standard'], 'Office/32x32/tag.png'),
                             (FOLDER, IDS['folder'], 'Office/32x32/folder.png')]:
        records.append(item(path, IDS['project'], IDS['template'], shared=[
            field(FIELDS['base'], '__Base template', brace(base)),
            field(FIELDS['standard'], '__Standard values', brace(uid(path + '/__Standard Values'))),
            field(FIELDS['icon'], '__Icon', icon),
        ]))
        defaults = [field(FIELDS['insert'], '__Masters', brace(uid(OPTION)))] if path == FOLDER else None
        records.append(item(path + '/__Standard Values', uid(path), uid(path), shared=defaults,
                            language_fields=[field(FIELDS['help'], '__Short description',
                                'Add a ResourceMetadataOption to extend this managed list.' if path == FOLDER else
                                'The item name is the stored metadata code. Change Display name for a friendly label; coordinate code changes with resource content and Search.')]))

    section = OPTION + '/Content'
    description_id = uid('field/ResourceMetadataOption/description')
    records.append(item(section, uid(OPTION), IDS['section']))
    records.append(item(section + '/description', uid(section), IDS['field'], identifier=description_id,
                        shared=[field(FIELDS['type'], 'Type', 'Multi-Line Text'),
                                field(FIELDS['sort'], '__Sortorder', '100')],
                        language_fields=[field(FIELDS['title'], 'Title', 'Description'),
                                         field(FIELDS['display'], '__Display name', 'Description'),
                                         field(FIELDS['help'], '__Short description',
                                               'Explain when authors should choose this option. This guidance does not change its stored code.')]))

    records.append(item(TAXONOMY, IDS['data'], IDS['folder'],
                        shared=[field(FIELDS['insert'], '__Masters', brace(uid(FOLDER)))],
                        language_fields=[field(FIELDS['display'], '__Display name', 'Taxonomy'),
                                         field(FIELDS['help'], '__Short description', config['description'])]))
    for folder_index, entry in enumerate(config['taxonomies'], 1):
        folder_path = TAXONOMY + '/' + entry['folder']
        records.append(item(folder_path, uid(TAXONOMY), uid(FOLDER),
                            shared=[field(FIELDS['sort'], '__Sortorder', folder_index * 100)],
                            language_fields=[field(FIELDS['display'], '__Display name', entry['folder']),
                                             field(FIELDS['help'], '__Short description', entry['description'])]))
        for option_index, option in enumerate(entry['options'], 1):
            records.append(item(folder_path + '/' + option['name'], uid(folder_path), uid(OPTION),
                                shared=[field(FIELDS['sort'], '__Sortorder', option_index * 100)],
                                language_fields=[field(FIELDS['display'], '__Display name', option['displayName'])],
                                values=[field(description_id, 'description', option['description'])]))
    return records


def build_manifest(config, records):
    return {
        'schemaVersion': '1.0.0',
        'site': SITE,
        'root': TAXONOMY,
        'rootId': uid(TAXONOMY),
        'templateIds': {'ResourceMetadataOption': uid(OPTION), 'ResourceMetadataFolder': uid(FOLDER)},
        'descriptionFieldId': uid('field/ResourceMetadataOption/description'),
        'taxonomyModule': 'LibertyMutual.Taxonomy',
        'deploymentPolicy': 'CreateOnly editable content; excluded from authoring resource packages.',
        'taxonomies': [{
            'field': entry['field'],
            'folder': entry['folder'],
            'source': TAXONOMY + '/' + entry['folder'],
            'sourceId': uid(TAXONOMY + '/' + entry['folder']),
            'options': [{**option, 'id': uid(TAXONOMY + '/' + entry['folder'] + '/' + option['name'])}
                        for option in entry['options']],
        } for entry in config['taxonomies']],
        'generatedFiles': [str(file_for(record).relative_to(ROOT)) for record in records],
    }


def module_configuration():
    return {
        '$schema': '../../../.sitecore/schemas/ModuleFile.schema.json',
        'namespace': 'LibertyMutual.Taxonomy',
        'items': {'includes': [{'name': 'taxonomy', 'path': TAXONOMY,
                                'allowedPushOperations': 'CreateOnly'}]},
        'description': 'Editable resource metadata lists. CreateOnly preserves author changes; never include this module in an authoring resource package.',
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Verify without creating or changing files.')
    args = parser.parse_args()
    config = load_configuration()
    records = build_items(config)
    planned = [(file_for(record), serialize(record), record) for record in records]
    for target, value in [
        (BASE / 'resource-taxonomy-manifest.json', build_manifest(config, records)),
        (BASE / 'LibertyMutual.Taxonomy.module.json', module_configuration()),
    ]:
        planned.append((target, json.dumps(value, indent=2, ensure_ascii=False) + '\n', value))
    missing = []
    # Validate the entire plan before writing its first file.
    for target, serialized, expected in planned:
        if not target.exists():
            missing.append((target, serialized))
            continue
        actual = json.loads(target.read_text()) if target.suffix == '.json' else yaml.safe_load(target.read_text(encoding='utf-8-sig'))
        if actual != expected:
            raise SystemExit('Refusing to overwrite an existing file that differs: ' + str(target.relative_to(ROOT)))
    if args.check and missing:
        raise SystemExit('Missing taxonomy files: ' + ', '.join(str(target.relative_to(ROOT)) for target, _ in missing))
    if not args.check:
        for target, serialized in missing:
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(serialized)
    mode = 'Verified' if args.check else 'Prepared'
    print(f'{mode} {len(records)} taxonomy items, {len(config["taxonomies"])} managed lists, '
          f'{sum(len(entry["options"]) for entry in config["taxonomies"])} options; {len(missing)} files created.'
          if not args.check else
          f'{mode} {len(records)} taxonomy items, {len(config["taxonomies"])} managed lists and '
          f'{sum(len(entry["options"]) for entry in config["taxonomies"])} options without changes.')


if __name__ == '__main__':
    main()
