#!/usr/bin/env python3
"""Read-only checks for the owned content seed and synthetic UDL import contract."""
from pathlib import Path
import copy
import hashlib
import json
import re
import uuid
import xml.etree.ElementTree as ET

import yaml

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / 'authoring/items/liberty-mutual'
FIXTURES = ROOT / 'examples/liberty-mutual-agent-portal/fixtures'


def require(condition, message):
    if not condition:
        raise ValueError(message)


def read_json(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))


model = read_json(BASE / 'LibertyMutual.Model.module.json')
content = read_json(BASE / 'LibertyMutual.Content.module.json')
expected_model_paths = {
    '/sitecore/templates/Project/LibertyMutual',
    '/sitecore/layout/Renderings/Project/LibertyMutual',
    '/sitecore/layout/Placeholder Settings/Project/LibertyMutual',
    '/sitecore/layout/Layouts/Project/LibertyMutual',
}
require({i['path'] for i in model['items']['includes']} == expected_model_paths,
        'Model includes must remain restricted to owned LibertyMutual roots.')
for include in model['items']['includes']:
    require(include.get('allowedPushOperations') == 'CreateAndUpdate' and not include.get('rules'),
            'Model release must not introduce deletion or wider include rules.')
require(len(content['items']['includes']) == 1, 'Content requires one owned include.')
include = content['items']['includes'][0]
require(include['path'] == '/sitecore/content/LibertyMutual' and
        include.get('allowedPushOperations') == 'CreateOnly' and not include.get('rules'),
        'Initial content seed must preserve marketing edits: CreateOnly with no rules.')

items = {}
paths = {}
for file in sorted((BASE / 'items').rglob('*.yml')):
    raw = file.read_text(encoding='utf-8-sig')
    require(not re.search(r"(?m)^\s*(?:- )?[^:\n]+: '(?:.*)'$", raw),
            f'Sitecore-incompatible single-quoted scalar: {file.relative_to(ROOT)}')
    require(not re.search(r'(?m)^\s*[^:\n]+: \|-$', raw),
            f'Sitecore-incompatible block chomping marker: {file.relative_to(ROOT)}')
    # SCS is a YAML-like format and emits a bare wildcard as a field scalar.
    # Quote only that documented serializer output for the general YAML reader.
    parseable = re.sub(r'(?m)^(\s*Value: )\*\s*$', r'\1"*"', raw)
    item = yaml.safe_load(parseable)
    item_id = str(uuid.UUID(item['ID']))
    require(item_id not in items, f'Duplicate item ID: {item_id}')
    require(item['Path'] not in paths, f'Duplicate item path: {item["Path"]}')
    require(any(item['Path'] == p or item['Path'].startswith(p + '/')
                for p in expected_model_paths | {'/sitecore/content/LibertyMutual'}),
            f'Item outside owned roots: {item["Path"]}')
    uuid.UUID(item['Parent'])
    uuid.UUID(item['Template'])
    items[item_id] = item
    paths[item['Path']] = item

manifest = read_json(BASE / 'content-manifest.json')
for relative in manifest['generatedFiles']:
    require((ROOT / relative).is_file(), f'Missing generated item: {relative}')
sources = read_json(ROOT / 'docs/brand/portal-content-seeds.json')['resources']
resources = manifest['resourcePages']
require(len(resources) == len(sources), 'Native resources and authored seed count differ.')
require({r['slug'] for r in resources} == {r['slug'] for r in sources}, 'Resource route mismatch.')
for resource in resources:
    item = items[str(uuid.UUID(resource['pageId']))]
    require(resource['pageId'] == resource['datasourceId'], 'ResourcePage must be its own datasource.')
    require(item['Path'] == manifest['site'] + '/Home/resources/' + resource['slug'],
            'Resource must live under the owned resource library.')
    require(item['Template'] == manifest['templateIds']['ResourcePage'], 'Resource template mismatch.')
    fields = [field for language in item.get('Languages', [])
              for version in language.get('Versions', []) for field in version.get('Fields', [])]
    hints = {field['Hint'] for field in fields}
    require({'Title', 'summary', 'body', 'state', 'resourceType', 'businessFamily'} <= hints,
            f'Incomplete authored resource metadata: {resource["slug"]}')

# Validate the composition graph, not just the existence of serialized files.
# An imported item can be valid YAML while pointing at a layout that exposes the
# wrong regions, or while a final-layout delta moves a rendering to another region.
TEMPLATE_ROOT = '/sitecore/templates/Project/LibertyMutual'
LAYOUT_ROOT = '/sitecore/layout/Layouts/Project/LibertyMutual'
PLACEHOLDER_ROOT = '/sitecore/layout/Placeholder Settings/Project/LibertyMutual'
PLACEMENTS = {
    'AgentGuidance': 'headless-agent-guidance',
    'ResourceSearch': 'headless-resource-search',
    'ResourceArticle': 'headless-resource-article',
    'ProductSpotlight': 'headless-products-spotlight',
}
LAYOUT_COMPONENTS = {
    'PortalLayout': ['AgentGuidance'],
    'ResourcesLayout': ['ResourceSearch', 'AgentGuidance'],
    'ResourceArticleLayout': ['ResourceArticle'],
    'ProductsLayout': ['AgentGuidance', 'ProductSpotlight'],
}


def normalized_id(value):
    return str(uuid.UUID(str(value).strip().strip('{}')))


def field_value(fields, hint):
    return next((str(f['Value']) if f.get('Value') is not None else ''
                 for f in fields if f.get('Hint') == hint), '')


def id_list(value):
    return [normalized_id(value) for value in re.findall(r'\{([0-9a-fA-F-]{36})\}', value)]


placeholder_ids = {}
for component, key in PLACEMENTS.items():
    placeholder = paths[PLACEHOLDER_ROOT + '/' + key]
    identifier = normalized_id(placeholder['ID'])
    require(manifest['placeholderIds'].get(key) == identifier, f'Placeholder manifest mismatch: {key}')
    require(field_value(placeholder.get('SharedFields', []), 'Placeholder Key') == key,
            f'Placeholder key mismatch: {key}')
    require(id_list(field_value(placeholder.get('SharedFields', []), 'Allowed Controls')) ==
            [normalized_id(manifest['renderingIds'][component])],
            f'{key} must permit only {component}; empty lists are unrestricted.')
    placeholder_ids[key] = identifier

layout_ids = {}
for name, components in LAYOUT_COMPONENTS.items():
    layout = paths[LAYOUT_ROOT + '/' + name]
    identifier = normalized_id(layout['ID'])
    require(manifest['layoutIds'].get(name) == identifier, f'Layout manifest mismatch: {name}')
    require(id_list(field_value(layout.get('SharedFields', []), 'Placeholders')) ==
            [placeholder_ids[PLACEMENTS[c]] for c in components],
            f'{name} must expose only its declared component regions in the expected order.')
    layout_ids[name] = identifier

# This supplementary editor field is versioned in the tenant's native rendering
# template. Placement restrictions still come from the unique placeholder keys.
for component, template_names in {
    'AgentGuidance': ['Page', 'PortalPage'],
    'ResourceSearch': ['PortalPage'],
    'ResourceArticle': ['ResourcePage'],
    'ProductSpotlight': ['PortalPage'],
}.items():
    rendering = items[normalized_id(manifest['renderingIds'][component])]
    require(not field_value(rendering.get('SharedFields', []), 'AllowedOnTemplates'),
            f'{component}: AllowedOnTemplates must be versioned, not shared.')
    expected = [normalized_id(paths[TEMPLATE_ROOT + '/' + name]['ID']) for name in template_names]
    versions = [version for language in rendering.get('Languages', [])
                for version in language.get('Versions', [])]
    require(bool(versions), f'{component}: missing versioned rendering settings.')
    for version in versions:
        allowlist = next((field for field in version.get('Fields', [])
                          if field.get('Hint') == 'AllowedOnTemplates'), {})
        require(allowlist.get('ID', '').lower() == '1b58d065-fe74-43e3-ba20-54c9588b3011' and
                id_list(str(allowlist.get('Value', ''))) == expected,
                f'{component}: versioned AllowedOnTemplates must match the declared page templates.')


def merge_presentation(raw, inherited, label):
    """Read only the device/layout/rendering attributes used by this portal.

    Native p:p="1" deltas update renderings by UID. Ordering, datasource,
    parameters and rule XML are not rewritten or interpreted as placement.
    Unknown patch operations fail closed so a future format needs review.
    """
    if not raw.strip():
        return copy.deepcopy(inherited)
    root = ET.fromstring(raw)
    require(root.tag == 'r', f'Invalid presentation root: {label}')
    is_delta = root.get('{p}p') == '1'
    result = copy.deepcopy(inherited) if is_delta else {}
    for device in root.findall('d'):
        device_id = normalized_id(device.get('id'))
        current = result.setdefault(device_id, {'layout': None, 'renderings': {}})
        for element in [device, *device.findall('r')]:
            patch_attributes = {key for key in element.attrib if key.startswith('{p}')}
            require(patch_attributes <= {'{p}before', '{p}after', '{p}delete'},
                    f'Unsupported presentation patch operation: {label}')
        if device.get('{p}delete') in ('1', 'true'):
            result.pop(device_id, None)
            continue
        layout = device.get('{s}l', device.get('l'))
        if layout is not None:
            current['layout'] = normalized_id(layout)
        for rendering in device.findall('r'):
            rendering_uid = normalized_id(rendering.get('uid'))
            if rendering.get('{p}delete') in ('1', 'true'):
                current['renderings'].pop(rendering_uid, None)
                continue
            attributes = current['renderings'].setdefault(rendering_uid, {})
            for key in ('id', 'ph'):
                value = rendering.get('{s}' + key, rendering.get(key))
                if value is not None:
                    attributes[key] = normalized_id(value) if key == 'id' else value
    return result


def template_presentation(template_id, visiting=None):
    visiting = set() if visiting is None else visiting
    identifier = normalized_id(template_id)
    require(identifier not in visiting, 'Circular page template inheritance.')
    template = items.get(identifier)
    if template is None:
        return {}  # Shared Sitecore templates are intentionally outside this module.
    defaults = paths.get(template['Path'] + '/__Standard Values')
    value = field_value(defaults.get('SharedFields', []), '__Renderings') if defaults else ''
    inherited = {}
    for base in id_list(field_value(template.get('SharedFields', []), '__Base template')):
        inherited = template_presentation(base, visiting | {identifier})
        if inherited:
            break
    return merge_presentation(value, inherited, template['Path'])


rendering_names = {normalized_id(value): name for name, value in manifest['renderingIds'].items()}


def validate_placement(presentation, expected_layout, label):
    require(bool(presentation), f'Missing page layout: {label}')
    for device in presentation.values():
        require(device['layout'] == layout_ids[expected_layout],
                f'{label} must use {expected_layout}, got {device["layout"]}.')
        allowed_components = set(LAYOUT_COMPONENTS[expected_layout])
        for rendering_uid, attributes in device['renderings'].items():
            name = rendering_names.get(attributes.get('id'))
            require(name in allowed_components,
                    f'{label}: rendering {rendering_uid} ({name}) is not allowed by {expected_layout}.')
            require(attributes.get('ph') == PLACEMENTS[name],
                    f'{label}: {name} must use {PLACEMENTS[name]}, got {attributes.get("ph")}.')


for template_name, layout_name in [('Page', 'PortalLayout'), ('PortalPage', 'PortalLayout'),
                                   ('ResourcePage', 'ResourceArticleLayout')]:
    template = paths[TEMPLATE_ROOT + '/' + template_name]
    validate_placement(template_presentation(template['ID']), layout_name, template['Path'] + ' defaults')

page_count = version_count = 0
resource_template = normalized_id(manifest['templateIds']['ResourcePage'])
page_templates = {normalized_id(paths[TEMPLATE_ROOT + '/' + name]['ID'])
                  for name in ('Page', 'PortalPage', 'ResourcePage')}
for item in items.values():
    if normalized_id(item['Template']) not in page_templates or not (
            item['Path'] == manifest['site'] + '/Home' or item['Path'].startswith(manifest['site'] + '/Home/')):
        continue
    expected_layout = 'ResourceArticleLayout' if normalized_id(item['Template']) == resource_template else (
        'ResourcesLayout' if item['Path'] == manifest['site'] + '/Home/resources' else
        'ProductsLayout' if item['Path'] == manifest['site'] + '/Home/products' else 'PortalLayout')
    shared = merge_presentation(field_value(item.get('SharedFields', []), '__Renderings'),
                                template_presentation(item['Template']), item['Path'] + ' shared')
    validate_placement(shared, expected_layout, item['Path'] + ' shared')
    page_count += 1
    for language in item.get('Languages', []):
        for version in language.get('Versions', []):
            label = f'{item["Path"]} {language["Language"]} v{version["Version"]}'
            effective = merge_presentation(field_value(version.get('Fields', []), '__Final Renderings'), shared, label)
            validate_placement(effective, expected_layout, label)
            version_count += 1

identities = read_json(FIXTURES / 'udl/profile-identity-map.json')['mapping']
records = [json.loads(line) for line in (FIXTURES / 'udl/liberty-mutual-profiles.jsonl').read_text().splitlines() if line]
require(len(records) == len(identities), 'Profile import and identity map count differ.')
identifiers = set()
for record in records:
    uuid.UUID(record['id'])  # Native import correlation IDs must be UUIDs.
    require(record['recordType'] == 'profile', 'Unexpected import record type.')
    require(len(record['identifiers']) == 1, 'Expected one provider identity per profile.')
    identity = record['identifiers'][0]
    require(identity['provider'] == 'liberty-mutual-agent', 'Unexpected identity provider.')
    require(identity['id'] not in identifiers, 'Duplicate profile provider identity.')
    identifiers.add(identity['id'])
    extension = record['extensions']
    require(all(value is None or isinstance(value, (str, int, float, bool)) for value in extension.values()),
            'Use tenant-verified scalar extensions; arrays caused native INVALID_RECORD failures.')
    require(not any('password' in key.lower() or 'secret' in key.lower() for key in extension),
            'Authentication data must never enter native profiles.')
for identity in identities:
    expected = hashlib.sha256(f'liberty-mutual-agent:v1:{identity["reviewerPack"]}:{identity["agentId"]}:{identity["generation"]}'.encode()).hexdigest()[:32]
    require(identity['identifier'] == expected and expected in identifiers, 'UDL/runtime identity parity failed.')

print(f'Validated {len(items)} scoped items, {page_count} page compositions across {version_count} versions, '
      f'{len(resources)} native resources, and {len(records)} UDL profile identities. No files modified.')
