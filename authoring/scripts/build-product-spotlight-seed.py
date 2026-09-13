#!/usr/bin/env python3
"""Create missing ProductSpotlight items and merge their manifest metadata.

Uses the same deterministic IDs and YAML format as the original seed generator,
without importing or running it. Existing items, including native authoring
snapshots, are preserved. No page layout, available-renderings list, existing
placeholder, module configuration, native affinity or campaign is changed.
This script never connects to Sitecore, pushes items or publishes content.

Run with the Python dependencies in requirements.txt. --check verifies that the
additive files and manifest entries exist without writing anything. New seed
datasources start in the installed workflow's Draft state for native review.
"""

from pathlib import Path
import argparse
import copy
import html
import json
import re
import uuid

import yaml


ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / 'authoring/items/liberty-mutual'
ITEMS = BASE / 'items'
MANIFEST = BASE / 'content-manifest.json'
NAMESPACE = uuid.UUID('4a098fe0-ad6b-4722-9862-4e56b855337a')
SITE = '/sitecore/content/LibertyMutual/liberty-mutual-agent-portal'
TEMPLATES = '/sitecore/templates/Project/LibertyMutual'
TEMPLATE_PATH = TEMPLATES + '/ProductSpotlight'
FOLDER_TEMPLATE_PATH = TEMPLATES + '/ProductSpotlightFolder'
DATASOURCE_PATH = SITE + '/Data/ProductSpotlight'
RENDERING_PATH = '/sitecore/layout/Renderings/Project/LibertyMutual/ProductSpotlight'
PLACEHOLDER_KEY = 'headless-products-spotlight'
PLACEHOLDER_PATH = '/sitecore/layout/Placeholder Settings/Project/LibertyMutual/' + PLACEHOLDER_KEY
VARIANT_PATH = SITE + '/Presentation/Headless Variants/ProductSpotlight'
LAYOUT_ROOT = '/sitecore/layout/Layouts/Project/LibertyMutual'
LAYOUT_PATH = LAYOUT_ROOT + '/ProductsLayout'
CREATED = '20260912T000000Z'
DATASOURCE_WORKFLOW = 'a053ed9f-4099-4682-9411-2b4c98e481e4'
DATASOURCE_DRAFT = '12ffac4c-565f-4c9a-b63e-7f77e96b4d1f'

FIELD_DEFINITIONS = [
    ('eyebrow', 'Eyebrow', 'Single-Line Text', 'Short context label above the product spotlight.'),
    ('headline', 'Headline', 'Single-Line Text', 'A concise next step for the visitor.'),
    ('body', 'Body', 'Rich Text', 'Reusable product preparation guidance. Never include private client or agency data.'),
    ('actionLink', 'Action link', 'General Link', 'Optional resource destination and meaningful link label. Leave empty when no action is needed.'),
]


def uid(key):
    return str(uuid.uuid5(NAMESPACE, key))


def brace(value):
    return '{' + value.upper() + '}'


def field(identifier, name, value):
    return {'ID': identifier, 'Hint': name, 'Value': str(value)}


def item(item_path, parent, template, shared=None, values=None, language_fields=None, identifier=None):
    result = {'ID': identifier or uid(item_path), 'Parent': parent, 'Template': template, 'Path': item_path}
    if shared:
        result['SharedFields'] = shared
    language = {'Language': 'en'}
    if language_fields:
        language['Fields'] = language_fields
    language['Versions'] = [{'Version': 1, 'Fields': values or [
        field('25bed78c-4957-4165-998a-ca1b52f67497', '__Created', CREATED),
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
    # The installed native SCS reader retains a quoted empty Value literally.
    # Use its own empty-field convention instead of YAML's quoted empty scalar.
    serialized = re.sub(r'(?m)^(\s*Value:) ""$', r'\1', serialized)
    return '---\n' + serialized


def file_for(value):
    for kind, prefix in [
        ('templates', '/sitecore/templates/Project/'),
        ('renderings', '/sitecore/layout/Renderings/Project/'),
        ('placeholders', '/sitecore/layout/Placeholder Settings/Project/'),
        ('layouts', '/sitecore/layout/Layouts/Project/'),
        ('content', '/sitecore/content/'),
    ]:
        if value['Path'].startswith(prefix):
            return ITEMS / kind / (value['Path'][len(prefix):] + '.yml')
    raise ValueError('Item is outside the owned ProductSpotlight roots.')


def link(label, destination):
    return '<link text="' + html.escape(label, quote=True) + '" linktype="external" url="' + html.escape(destination, quote=True) + '" />'


def build_items(manifest):
    records = []
    for name, template_path, base_template in [
        ('ProductSpotlight', TEMPLATE_PATH, '1930bbeb-7805-471a-a3be-4858ac7cf696'),
        ('ProductSpotlightFolder', FOLDER_TEMPLATE_PATH, 'a87a00b1-e6db-45ab-8b54-636fec3b5523'),
    ]:
        records.append(item(template_path, '94b480f8-5b0a-4487-99bb-238569489481',
                            'ab86861a-6030-46c5-b394-e8f99e8b87db', shared=[
                                field('12c33f3f-86c5-43a5-aeb4-5598cec45116', '__Base template', brace(base_template)),
                                field('06d5295c-ed2f-4a54-9bf2-26228d113318', '__Icon', 'Office/32x32/document_text.png'),
                                field('f7d48a55-2158-4f02-9356-756654404f73', '__Standard values', brace(uid(template_path + '/__Standard Values'))),
                            ]))
        defaults = [field('ca9b9f52-4fb0-4f87-a79f-24dea62cda65', '__Default workflow', brace(DATASOURCE_WORKFLOW))] if name == 'ProductSpotlight' else [
            field('1172f251-dad4-4efb-a329-0c63500e4f1e', '__Masters', brace(uid(TEMPLATE_PATH))),
        ]
        records.append(item(template_path + '/__Standard Values', uid(template_path), uid(template_path), shared=defaults))

    section_path = TEMPLATE_PATH + '/Content'
    records.append(item(section_path, uid(TEMPLATE_PATH), 'e269fbb5-3750-427a-9149-7aa950b49301'))
    for index, (name, label, kind, help_text) in enumerate(FIELD_DEFINITIONS, 1):
        shared = [field('ab162cc0-dc80-4abf-8871-998ee5d7ba32', 'Type', kind),
                  field('ba3f86a2-4a1c-4d78-b63d-91c2779c1b5e', '__Sortorder', index * 100)]
        if kind == 'Rich Text':
            shared.append(field('1eb8ae32-e190-44a6-968d-ed904c794ebf', 'Source', 'query:$xaRichTextProfile'))
        records.append(item(section_path + '/' + name, uid(section_path), '455a3e98-a627-4b40-8035-e683a0331ac7',
                            shared=shared, identifier=uid('field/ProductSpotlight/' + name), language_fields=[
                                field('19a69332-a23e-4e70-8d16-b2640cb24cc8', 'Title', label),
                                field('b5e02ad9-d56f-4c41-a065-a133db87bdeb', '__Display name', label),
                                field('9541e67d-ce8c-4225-803d-33f7f29f09ef', '__Short description', help_text),
                            ]))

    records.append(item(RENDERING_PATH, '705f29fc-a5de-489e-9e2e-2dac8e03d084', '04646a89-996f-4ee7-878a-ffdbf1f0ef0d', shared=[
        field('037fe404-dd19-4bf7-8e30-4dadf68b27b0', 'componentName', 'ProductSpotlight'),
        field('1a7c85e5-dc0b-490d-9187-bb1dbcb4c72f', 'Datasource Template', TEMPLATE_PATH),
        field('b5b27af1-25ef-405c-87ce-369b3a004016', 'Datasource Location', DATASOURCE_PATH),
        field('a77e8568-1ab3-44f1-a664-b7c37ec7810d', 'Parameters Template', brace(manifest['templateIds']['PortalRenderingParameters'])),
        field('06d5295c-ed2f-4a54-9bf2-26228d113318', '__Icon', 'Office/32x32/document_text.png'),
    ]))
    records.append(item(PLACEHOLDER_PATH, 'e26a2d36-9ee9-49df-bb07-0073d8e20ccc', '5c547d4e-7111-4995-95b0-6b561751bf2e', shared=[
        field('7256bdab-1fd2-49dd-b205-cb4873d2917c', 'Placeholder Key', PLACEHOLDER_KEY),
        field('e391b526-d0c5-439d-803e-17512eae6222', 'Allowed Controls', brace(uid(RENDERING_PATH))),
    ]))
    # Native JSS Layout metadata was read before this additive layout was defined.
    # Preserve its three existing roots; only the owned Products layout adds the
    # spotlight root. The Foundation layout and other page layouts stay intact.
    records.append(item(LAYOUT_ROOT, 'da04b275-8838-4a3a-afee-817cf1fdd2eb', 'a87a00b1-e6db-45ab-8b54-636fec3b5523'))
    records.append(item(LAYOUT_PATH, uid(LAYOUT_ROOT), 'e4e11508-04a4-4b0b-a263-5201f811c9cd', shared=[
        field('a036b2bc-ba04-44f6-a75f-bae6cd242abf', 'Path', '/Views/SXA JSS/SXA JSS Layout.cshtml'),
        field('80334869-86dc-4472-aa89-44cf1b2f6c9b', 'Placeholders', '|'.join(brace(value) for value in [
            '21f39740-9a0d-40d1-8341-0896179c9a1b',
            '284d388a-9d4e-4742-a298-ec6871592d4b',
            '49e56593-bb61-41ca-8b9a-806b11486366',
            uid(PLACEHOLDER_PATH),
        ])),
    ]))
    records.append(item(DATASOURCE_PATH, '20e904a1-9b60-43a1-a8d0-8e3aee45b115', uid(FOLDER_TEMPLATE_PATH)))
    records.append(item(VARIANT_PATH, '19a63bdd-f9c6-403b-8068-c1884e9bb413', '49c111d0-6867-4798-a724-1f103166e6e9'))
    records.append(item(VARIANT_PATH + '/Default', uid(VARIANT_PATH), '4d50cdae-c2d9-4de8-b080-8f992bfb1b55'))

    copy_by_name = {
        'neutral': {
            'eyebrow': 'LOCAL KNOWLEDGE. BROAD POSSIBILITIES.',
            'headline': 'Protection built around the business you know.',
            'body': '<p>From the first home to a growing enterprise, explore guidance, prepare your account, and connect with a specialist.</p>',
            'actionLink': '',
        },
        'workers_compensation': {
            'eyebrow': 'WORKERS COMPENSATION',
            'headline': 'Build a stronger workers compensation conversation',
            'body': '<p>Bring the employer\'s operations, payroll and risk locations into focus. Review the preparation guide, then check the guidance for the applicable risk state.</p>',
            'actionLink': link('Review account preparation', '/resources/build-a-bop-submission'),
        },
        'household': {
            'eyebrow': 'HOUSEHOLD RENEWAL',
            'headline': 'Make the next household renewal conversation count',
            'body': '<p>Review what has changed for your client, organize questions about their home and vehicles, and prepare a clear next step for the renewal conversation.</p>',
            'actionLink': link('Review the household renewal checklist', '/resources/prepare-a-household-renewal'),
        },
    }
    for name, values in copy_by_name.items():
        content_fields = [field(uid('field/ProductSpotlight/' + key), key, value) for key, value in values.items()]
        content_fields.append(field('3e431de1-525e-47a3-b6b0-1ccbec3a8c98', '__Workflow state', brace(DATASOURCE_DRAFT)))
        records.append(item(DATASOURCE_PATH + '/' + name, uid(DATASOURCE_PATH), uid(TEMPLATE_PATH),
                            shared=[field('a4f985d9-98b3-4b52-aaaf-4344f6e747c6', '__Workflow', brace(DATASOURCE_WORKFLOW))],
                            values=content_fields))
    return records


def merge_new_entries(target, additions):
    for key, value in additions.items():
        if key in target and target[key] != value:
            raise ValueError('Existing manifest value differs for ' + key + '; preserve and review it before proceeding.')
        target.setdefault(key, value)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Check additive items and metadata without writing files.')
    args = parser.parse_args()
    before = MANIFEST.read_text(encoding='utf-8')
    manifest = json.loads(before)
    if manifest['site'] != SITE:
        raise ValueError('Unexpected site in content manifest.')
    updated = copy.deepcopy(manifest)
    records = build_items(manifest)
    merge_new_entries(updated['templateIds'], {'ProductSpotlight': uid(TEMPLATE_PATH), 'ProductSpotlightFolder': uid(FOLDER_TEMPLATE_PATH)})
    merge_new_entries(updated['fieldIds'], {'ProductSpotlight.' + name: uid('field/ProductSpotlight/' + name) for name, _, _, _ in FIELD_DEFINITIONS})
    merge_new_entries(updated['renderingIds'], {'ProductSpotlight': uid(RENDERING_PATH)})
    merge_new_entries(updated.setdefault('placeholderIds', {}), {PLACEHOLDER_KEY: uid(PLACEHOLDER_PATH)})
    merge_new_entries(updated.setdefault('layoutIds', {}), {'ProductsLayout': uid(LAYOUT_PATH)})
    spotlight = {
        'placeholderKey': PLACEHOLDER_KEY,
        'placeholderId': uid(PLACEHOLDER_PATH),
        'targetPageId': manifest['routePageIds']['products'],
        'layoutId': uid(LAYOUT_PATH),
        'datasourceFolderId': uid(DATASOURCE_PATH),
        'datasourceIds': {name: uid(DATASOURCE_PATH + '/' + name) for name in ['neutral', 'workers_compensation', 'household']},
        'defaultVariantId': uid(VARIANT_PATH + '/Default'),
        'seedWorkflowStatus': 'New datasource seeds start in Basic Datasource Workflow Draft and require native review, approval and publication.',
        'deploymentScope': 'Additive model and initial content only. Products page layout assignment, Available Renderings and native affinity configuration are applied separately and captured from the target.',
    }
    merge_new_entries(updated.setdefault('productSpotlight', {}), spotlight)
    missing = []
    for record in records:
        destination = file_for(record)
        relative = str(destination.relative_to(ROOT))
        if relative not in updated['generatedFiles']:
            updated['generatedFiles'].append(relative)
        if destination.exists():
            existing = yaml.safe_load(destination.read_text(encoding='utf-8-sig'))
            if any(existing.get(key) != record[key] for key in ['ID', 'Path', 'Template', 'Parent']):
                raise ValueError('Existing item identity differs at ' + relative + '; no files were written.')
        else:
            missing.append((destination, serialize(record)))
    if args.check:
        if missing or updated != manifest:
            raise ValueError('ProductSpotlight seed files or manifest entries are missing.')
        print(f'Checked {len(records)} ProductSpotlight item identities and manifest entries; no files modified.')
        return
    if MANIFEST.read_text(encoding='utf-8') != before:
        raise ValueError('Manifest changed during preparation; retry after reviewing concurrent work.')
    for destination, serialized in missing:
        destination.parent.mkdir(parents=True, exist_ok=True)
        with destination.open('x', encoding='utf-8') as handle:
            handle.write(serialized)
    if updated != manifest:
        MANIFEST.write_text(json.dumps(updated, indent=2) + '\n', encoding='utf-8')
    print(f'Created {len(missing)} missing ProductSpotlight items; preserved {len(records) - len(missing)} existing item snapshots. No native operations performed.')


if __name__ == '__main__':
    main()
