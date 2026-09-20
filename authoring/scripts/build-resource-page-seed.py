#!/usr/bin/env python3
"""Generate the additive ResourceImage model without replacing authored content.

Existing native snapshots are preserved. --check verifies the declared model,
including exact field values, without writing. This script never connects to
Sitecore. The editable Resource page branch is captured separately after native
creation; it is never part of an authoring resource package.
"""
from pathlib import Path
import argparse
import copy
import importlib.util
import json
import subprocess
import sys
import yaml
from component_library_model import apply_rendering_metadata

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / 'authoring/items/liberty-mutual'
sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('resource_seed_helpers', Path(__file__).with_name('build-product-spotlight-seed.py'))
helpers = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helpers)
uid, field, item, brace, serialize = helpers.uid, helpers.field, helpers.item, helpers.brace, helpers.serialize
SITE = helpers.SITE
TEMPLATE = helpers.TEMPLATES + '/ResourceImage'
RENDERING = '/sitecore/layout/Renderings/Project/LibertyMutual/ResourceImage'
KEY = 'headless-resource-image'
PLACEHOLDER = '/sitecore/layout/Placeholder Settings/Project/LibertyMutual/' + KEY
SITE_PLACEHOLDER = SITE + '/Presentation/Placeholder Settings/' + KEY
VARIANT = SITE + '/Presentation/Headless Variants/ResourceImage'


def branch_model():
    code = "const m=require('./authoring/scripts/resource-page-authoring-model.cjs'); process.stdout.write(JSON.stringify({...m,layout:m.branchLayout(),rule:m.appendRule('')}));"
    return json.loads(subprocess.check_output(['node', '-e', code], cwd=ROOT, text=True))


def records(manifest):
    result = [item(TEMPLATE, '94b480f8-5b0a-4487-99bb-238569489481', 'ab86861a-6030-46c5-b394-e8f99e8b87db', shared=[
        field('12c33f3f-86c5-43a5-aeb4-5598cec45116', '__Base template', brace('1930bbeb-7805-471a-a3be-4858ac7cf696')),
        field('06d5295c-ed2f-4a54-9bf2-26228d113318', '__Icon', 'Office/32x32/photo_landscape.png'),
        field('f7d48a55-2158-4f02-9356-756654404f73', '__Standard values', brace(uid(TEMPLATE + '/__Standard Values'))),
    ])]
    # The image and caption are page-local supporting content. No independent
    # approval workflow is imposed; the resource page retains Basic Workflow.
    result.append(item(TEMPLATE + '/__Standard Values', uid(TEMPLATE), uid(TEMPLATE)))
    section = TEMPLATE + '/Content'
    result.append(item(section, uid(TEMPLATE), 'e269fbb5-3750-427a-9149-7aa950b49301'))
    for index, (name, label, kind, description) in enumerate([
        ('image', 'Resource image', 'Image', 'Choose an image from Media. Provide meaningful alt text before publishing.'),
        ('caption', 'Caption', 'Single-Line Text', 'Optional context displayed below the resource image.'),
    ], 1):
        result.append(item(section + '/' + name, uid(section), '455a3e98-a627-4b40-8035-e683a0331ac7',
            identifier=uid('field/ResourceImage/' + name), shared=[
                field('ab162cc0-dc80-4abf-8871-998ee5d7ba32', 'Type', kind),
                field('ba3f86a2-4a1c-4d78-b63d-91c2779c1b5e', '__Sortorder', index * 100),
            ], language_fields=[
                field('19a69332-a23e-4e70-8d16-b2640cb24cc8', 'Title', label),
                field('b5e02ad9-d56f-4c41-a065-a133db87bdeb', '__Display name', label),
                field('9541e67d-ce8c-4225-803d-33f7f29f09ef', '__Short description', description),
            ]))
    result.append(item(RENDERING, '705f29fc-a5de-489e-9e2e-2dac8e03d084', '04646a89-996f-4ee7-878a-ffdbf1f0ef0d', shared=[
        field('037fe404-dd19-4bf7-8e30-4dadf68b27b0', 'componentName', 'ResourceImage'),
        field('1a7c85e5-dc0b-490d-9187-bb1dbcb4c72f', 'Datasource Template', TEMPLATE),
        field('b5b27af1-25ef-405c-87ce-369b3a004016', 'Datasource Location', 'query:./Data'),
        field('a77e8568-1ab3-44f1-a664-b7c37ec7810d', 'Parameters Template', brace(manifest['templateIds']['PortalRenderingParameters'])),
        field('06d5295c-ed2f-4a54-9bf2-26228d113318', '__Icon', 'Office/32x32/photo_landscape.png'),
    ], values=[field('1b58d065-fe74-43e3-ba20-54c9588b3011', 'AllowedOnTemplates', brace(manifest['templateIds']['ResourcePage']))]))
    for ph_path, parent, template in [
        (PLACEHOLDER, 'e26a2d36-9ee9-49df-bb07-0073d8e20ccc', '5c547d4e-7111-4995-95b0-6b561751bf2e'),
        (SITE_PLACEHOLDER, 'e601261f-f47f-4831-b91e-ef70efab3276', 'd2a6884c-04d5-4089-a64e-d27ca9d68d4c'),
    ]:
        result.append(item(ph_path, parent, template, shared=[
            field('7256bdab-1fd2-49dd-b205-cb4873d2917c', 'Placeholder Key', KEY + '-{*}'),
            field('e391b526-d0c5-439d-803e-17512eae6222', 'Allowed Controls', brace(uid(RENDERING))),
        ]))
    result.append(item(VARIANT, '19a63bdd-f9c6-403b-8068-c1884e9bb413', '49c111d0-6867-4798-a724-1f103166e6e9'))
    result.append(item(VARIANT + '/Default', uid(VARIANT), '4d50cdae-c2d9-4de8-b080-8f992bfb1b55'))
    for record in result:
        if record['Path'] == RENDERING:
            apply_rendering_metadata(record)
    return result


def branch_records(manifest, model):
    ids = model['IDS']
    branch = item(model['BRANCH_PATH'], ids['branchFolder'], ids['branchTemplate'], identifier=ids['branch'])
    prototype = item(model['PROTOTYPE_PATH'], ids['branch'], ids['pageTemplate'], identifier=ids['prototype'], shared=[
        field('1172f251-dad4-4efb-a329-0c63500e4f1e', '__Masters', brace(ids['dataTemplate'])),
        field('f1a1fe9e-a60c-4ddb-a3a0-bb5b29fe732e', '__Renderings', model['layout']),
        field('a4f985d9-98b3-4b52-aaaf-4344f6e747c6', '__Workflow', brace('b4f49b23-4bba-4c79-ba22-f89f5f0d4e4f')),
    ], values=[
        field('d3bed2bd-a5f0-49ab-b7a5-6b72b0f34e4b', 'Title', '$name'),
        field('4e0720e9-9d50-4ddc-87cf-ecd65e8e94c8', 'NavigationTitle', '$name'),
        field('3e431de1-525e-47a3-b6b0-1ccbec3a8c98', '__Workflow state', brace('57cc7dce-e6b1-4564-9581-0e5850b8bdf2')),
        *[field(manifest['fieldIds']['ResourcePage.' + name], name, '') for name in
          ['summary', 'body', 'resourceType', 'state', 'reviewedAt', 'sourceLink', 'businessFamily', 'product', 'channel']],
    ])
    data = item(model['DATA_PATH'], ids['prototype'], ids['dataTemplate'], identifier=ids['data'], shared=[
        field('1172f251-dad4-4efb-a329-0c63500e4f1e', '__Masters', brace(ids['imageTemplate'])),
    ])
    image = item(model['IMAGE_PATH'], ids['data'], ids['imageTemplate'], identifier=ids['image'], values=[
        field(ids['imageField'], 'image', ''), field(ids['captionField'], 'caption', ''),
    ])
    return [branch, prototype, data, image]


def file_for(record):
    branch_root = SITE + '/Presentation/Page Branches/Resource page'
    if record['Path'] == branch_root or record['Path'].startswith(branch_root + '/'):
        # SCS escapes '$' as '#' in serialized filesystem names; the item Path
        # retains the literal native $name token.
        return BASE / 'items/resource-page-branch' / ('Resource page' + record['Path'][len(branch_root):].replace('$', '#') + '.yml')
    if record['Path'] == SITE_PLACEHOLDER:
        return BASE / 'items/site-resource-image' / (KEY + '.yml')
    return helpers.file_for(record)


def fields_by_id(record):
    result = {('shared', f['ID']): '' if f.get('Value') is None else str(f['Value']) for f in record.get('SharedFields', [])}
    for language in record.get('Languages', []):
        for f in language.get('Fields', []):
            result[(language['Language'], f['ID'])] = '' if f.get('Value') is None else str(f['Value'])
        for version in language.get('Versions', []):
            for f in version.get('Fields', []):
                if f['Hint'] != '__Created':
                    result[(language['Language'], version['Version'], f['ID'])] = '' if f.get('Value') is None else str(f['Value'])
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    manifest_path = BASE / 'content-manifest.json'
    original = json.loads(manifest_path.read_text())
    manifest = copy.deepcopy(original)
    model = branch_model()
    additions = records(manifest) + branch_records(manifest, model)
    for record in additions:
        filename = file_for(record)
        if filename.exists():
            existing = yaml.safe_load(filename.read_text(encoding='utf-8-sig'))
            if any(existing.get(key) != record[key] for key in ['ID', 'Parent', 'Template', 'Path']):
                raise ValueError('Existing item identity differs: ' + str(filename))
            current_fields = fields_by_id(existing)
            if any(current_fields.get(key) != value for key, value in fields_by_id(record).items()):
                raise ValueError('Existing model differs; review before changing: ' + str(filename))
        elif args.check:
            raise ValueError('Missing additive model item: ' + str(filename))
        else:
            filename.parent.mkdir(parents=True, exist_ok=True)
            filename.write_text(serialize(record))
    updates = {
        'templateIds': {'ResourceImage': uid(TEMPLATE)},
        'fieldIds': {'ResourceImage.' + name: uid('field/ResourceImage/' + name) for name in ['image', 'caption']},
        'renderingIds': {'ResourceImage': uid(RENDERING)},
        'placeholderIds': {KEY: uid(PLACEHOLDER)},
        'sitePlaceholderIds': {KEY: uid(SITE_PLACEHOLDER)},
    }
    for group, values in updates.items():
        helpers.merge_new_entries(manifest.setdefault(group, {}), values)
    for record in additions:
        relative = str(file_for(record).relative_to(ROOT))
        if relative not in manifest['generatedFiles']:
            manifest['generatedFiles'].append(relative)
    if args.check and manifest != original:
        raise ValueError('The ResourceImage manifest entries are missing or different.')
    if not args.check and manifest != original:
        manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
    contract = {key: model[key] for key in ['SITE', 'BRANCH_PATH', 'PROTOTYPE_PATH', 'DATA_PATH', 'IMAGE_PATH', 'PLACEHOLDER', 'PLACEHOLDER_KEY', 'NESTED_PLACEHOLDER', 'IDS', 'FIELDS', 'ARTICLE_INSTANCE', 'IMAGE_INSTANCE']}
    contract['schemaVersion'] = 1
    contract['branchLayout'] = model['layout']
    contract['branchInsertRule'] = model['rule']
    contract['editorialFieldsOnPage'] = ['Title', 'summary', 'body', 'resourceType', 'state', 'reviewedAt', 'sourceLink', 'businessFamily', 'product', 'channel']
    contract['localImageFields'] = ['image', 'caption']
    contract_path = BASE / 'resource-page-authoring-manifest.json'
    if args.check:
        if not contract_path.exists() or json.loads(contract_path.read_text()) != contract:
            raise ValueError('Resource page authoring manifest differs from the declared model.')
    else:
        contract_path.write_text(json.dumps(contract, indent=2) + '\n')
    print(('Verified' if args.check else 'Generated') + f' {len(additions)} additive ResourceImage items. No native content changed.')


if __name__ == '__main__':
    main()
