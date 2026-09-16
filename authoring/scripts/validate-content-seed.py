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
site_presentation = read_json(BASE / 'LibertyMutual.SitePresentation.module.json')
taxonomy = read_json(BASE / 'LibertyMutual.Taxonomy.module.json')
resource_branch = read_json(BASE / 'LibertyMutual.ResourcePageBranch.module.json')
resource_branch_path = '/sitecore/content/LibertyMutual/liberty-mutual-agent-portal/Presentation/Page Branches/Resource page'
taxonomy_root = '/sitecore/content/LibertyMutual/liberty-mutual-agent-portal/Data/Taxonomy'
site_placeholder_root = '/sitecore/content/LibertyMutual/liberty-mutual-agent-portal/Presentation/Placeholder Settings'
site_placeholder_keys = ['headless-agent-guidance', 'headless-resource-search',
                         'headless-resource-article', 'headless-products-spotlight', 'headless-resource-image',
                         'headless-campaign-page', 'headless-campaign-hero', 'headless-campaign-main', 'headless-campaign-sidebar']
site_placeholder_paths = {site_placeholder_root + '/' + key for key in site_placeholder_keys}
api_owned_campaign_paths = {'/sitecore/content/LibertyMutual/liberty-mutual-agent-portal/Home/growth/' + slug
                            for slug in ['small-business', 'campaign-practice', 'campaign-schedule-check']}
expected_model_paths = {
    '/sitecore/templates/Project/LibertyMutual',
    '/sitecore/layout/Renderings/Project/LibertyMutual',
    '/sitecore/layout/Placeholder Settings/Project/LibertyMutual',
    '/sitecore/layout/Layouts/Project/LibertyMutual',
}
require({i['path'] for i in model['items']['includes']} == expected_model_paths,
        'Model includes must remain restricted to four owned roots.')
for include in model['items']['includes']:
    expected_rules = {'placeholders': [{'path': '/headless-support-form', 'scope': 'Ignored'}], 'layouts': [{'path': '/SupportLayout', 'scope': 'Ignored'}]}.get(include['name'], [])
    require(include.get('allowedPushOperations') == 'CreateAndUpdate' and include.get('rules', []) == expected_rules,
            'Model release must not introduce deletion or wider include rules.')
    require(include.get('scope', 'ItemAndDescendants') == 'ItemAndDescendants',
            'Model roots must retain their bounded descendant scope.')
require({i['path'] for i in site_presentation['items']['includes']} == site_placeholder_paths,
        'SitePresentation includes must contain only the nine exact site placeholder items.')
for include in site_presentation['items']['includes']:
    require(include.get('scope') == 'SingleItem' and include.get('allowedPushOperations') == 'CreateAndUpdate'
            and not include.get('rules'), 'SitePresentation must use non-deleting SingleItem includes only.')
require(len(content['items']['includes']) == 1, 'Content requires one owned include.')
include = content['items']['includes'][0]
expected_ignore_rules = [{'path': path.removeprefix('/sitecore/content/LibertyMutual'), 'scope': 'Ignored'}
                         for path in sorted(site_placeholder_paths | {site_placeholder_root + '/headless-support-form'} | api_owned_campaign_paths | {taxonomy_root, resource_branch_path, resource_branch_path.replace('Resource page', 'Campaign page')})]
require(include['path'] == '/sitecore/content/LibertyMutual' and
        include.get('allowedPushOperations') == 'CreateOnly' and
        include.get('scope', 'ItemAndDescendants') == 'ItemAndDescendants' and
        sorted(include.get('rules', []), key=lambda rule: rule['path']) == expected_ignore_rules,
        'Initial content seed must remain CreateOnly with exact site placeholder, taxonomy, branch, and API-owned campaign exclusions.')
require(resource_branch['items']['includes'] == [{'name': 'resource-page-branch', 'path': resource_branch_path,
                                                 'allowedPushOperations': 'CreateOnly'}],
        'Editable resource branch must remain in one CreateOnly subtree.')
require(len(taxonomy['items']['includes']) == 1, 'Taxonomy requires one isolated include.')
include = taxonomy['items']['includes'][0]
require(include['path'] == taxonomy_root and include.get('allowedPushOperations') == 'CreateOnly'
        and include.get('scope', 'ItemAndDescendants') == 'ItemAndDescendants' and not include.get('rules'),
        'Taxonomy must remain CreateOnly and restricted to its owned subtree.')
resource_modules = read_json(ROOT / 'xmcloud.build.json')['deployItems']['modules']
require(len(resource_modules) == 4 and set(resource_modules) ==
        {'nextjs-starter', 'LibertyMutual.Model', 'LibertyMutual.SitePresentation', 'LibertyMutual.SupportForm'},
        'Editable content and taxonomy must remain outside authoring resource packages.')

support_module = read_json(BASE / 'LibertyMutual.SupportForm.module.json')
require(support_module['items']['includes'] == [
    {'name': 'support-form-layout', 'path': '/sitecore/layout/Layouts/Project/LibertyMutual/SupportLayout', 'scope': 'SingleItem', 'allowedPushOperations': 'CreateAndUpdate'},
    {'name': 'support-form-placeholder', 'path': '/sitecore/layout/Placeholder Settings/Project/LibertyMutual/headless-support-form', 'scope': 'SingleItem', 'allowedPushOperations': 'CreateAndUpdate'},
    {'name': 'support-form-site', 'path': site_placeholder_root + '/headless-support-form', 'scope': 'SingleItem', 'allowedPushOperations': 'CreateAndUpdate'},
], 'Support Form module must contain exactly the three developer-owned layout/placeholder definitions.')

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
# Home is the sole workspace page. Keep its native identity and reject a stale
# serialized child so a later CreateOnly seed cannot recreate the removed route.
home_path = manifest['site'] + '/Home'
require(manifest['routePageIds'].get('home') == 'ae9e45ca-f127-4abe-9ca7-2ff109981998',
        'Home must retain its existing native item identity.')
require('workspace' not in manifest['routePageIds'] and home_path + '/workspace' not in paths,
        'The removed workspace child must not be present in the content seed.')
require(paths[home_path]['ID'] == manifest['routePageIds']['home'],
        'The canonical Home page and route manifest must agree.')
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
    'ResourceImage': 'headless-resource-image',
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


# Managed choices remain native editable content. Their names are existing scalar
# contract values; no GUID migration or unsupported Search field type is implied.
taxonomy_manifest = read_json(BASE / 'resource-taxonomy-manifest.json')
require(taxonomy_manifest['root'] == taxonomy_root, 'Taxonomy manifest root differs from its module.')
option_template = normalized_id(taxonomy_manifest['templateIds']['ResourceMetadataOption'])
folder_template = normalized_id(taxonomy_manifest['templateIds']['ResourceMetadataFolder'])
taxonomy_item = paths[taxonomy_root]
require(id_list(field_value(taxonomy_item.get('SharedFields', []), '__Masters')) == [folder_template],
        'Taxonomy root must offer only the managed metadata folder as its insert option.')
folder_defaults = paths[TEMPLATE_ROOT + '/ResourceMetadataFolder/__Standard Values']
require(id_list(field_value(folder_defaults.get('SharedFields', []), '__Masters')) == [option_template],
        'Metadata folders must offer only managed metadata options.')
expected_taxonomy_paths = {taxonomy_root}
taxonomy_values = {}
for managed_list in taxonomy_manifest['taxonomies']:
    source = managed_list['source']
    require(source == taxonomy_root + '/' + managed_list['folder'], 'Metadata list must be a direct taxonomy child.')
    folder = paths[source]
    require(normalized_id(folder['ID']) == normalized_id(managed_list['sourceId'])
            and normalized_id(folder['Template']) == folder_template
            and normalized_id(folder['Parent']) == normalized_id(taxonomy_item['ID']),
            'Metadata list identity or parent is incorrect: ' + source)
    expected_taxonomy_paths.add(source)
    values = set()
    for option in managed_list['options']:
        option_path = source + '/' + option['name']
        entry = paths[option_path]
        require(normalized_id(entry['ID']) == normalized_id(option['id'])
                and normalized_id(entry['Template']) == option_template
                and normalized_id(entry['Parent']) == normalized_id(folder['ID']),
                'Metadata option identity or parent is incorrect: ' + option_path)
        english = next(language for language in entry['Languages'] if language['Language'] == 'en')
        require(field_value(english.get('Fields', []), '__Display name') == option['displayName']
                and field_value(english['Versions'][0]['Fields'], 'description') == option['description'],
                'Metadata option needs its declared label and description: ' + option_path)
        require(option['name'] not in values, 'Duplicate metadata option code: ' + option_path)
        values.add(option['name'])
        expected_taxonomy_paths.add(option_path)
    require(managed_list['field'] not in taxonomy_values, 'Duplicate metadata field mapping.')
    taxonomy_values[managed_list['field']] = values
require(set(taxonomy_values) == {'state', 'businessFamily', 'product', 'channel', 'resourceType'},
        'Expected exactly five resource metadata lists.')
require({path for path in paths if path == taxonomy_root or path.startswith(taxonomy_root + '/')} ==
        expected_taxonomy_paths, 'Taxonomy contains undeclared folders or options.')
for relative in taxonomy_manifest['generatedFiles']:
    require((ROOT / relative).is_file(), 'Missing generated taxonomy item: ' + relative)
for metadata_field in taxonomy_values:
    definition = paths[TEMPLATE_ROOT + '/ResourcePage/Content/' + metadata_field]
    require(field_value(definition['SharedFields'], 'Type') == 'Single-Line Text',
            'ResourcePage metadata must retain its tenant-verified Search-supported text type: ' + metadata_field)
for resource in resources:
    entry = items[normalized_id(resource['pageId'])]
    for language in entry['Languages']:
        for version in language['Versions']:
            for metadata_field, values in taxonomy_values.items():
                value = field_value(version['Fields'], metadata_field)
                require(value in values, f'Authored metadata has no managed option: {entry["Path"]} {metadata_field}={value}')


placeholder_ids = {}
for component, key in PLACEMENTS.items():
    setting_key = key + '-{*}' if component == 'ResourceImage' else key
    placeholder = paths[PLACEHOLDER_ROOT + '/' + key]
    identifier = normalized_id(placeholder['ID'])
    require(manifest['placeholderIds'].get(key) == identifier, f'Placeholder manifest mismatch: {key}')
    require(field_value(placeholder.get('SharedFields', []), 'Placeholder Key') == setting_key,
            f'Placeholder key mismatch: {key}')
    require(id_list(field_value(placeholder.get('SharedFields', []), 'Allowed Controls')) ==
            [normalized_id(manifest['renderingIds'][component])],
            f'{key} must permit only {component}; empty lists are unrestricted.')
    placeholder_ids[key] = identifier
    site_placeholder = paths[site_placeholder_root + '/' + key]
    require(normalized_id(site_placeholder['ID']) == manifest['sitePlaceholderIds'].get(key),
            f'Site placeholder manifest mismatch: {key}')
    require(normalized_id(site_placeholder['Template']) == 'd2a6884c-04d5-4089-a64e-d27ca9d68d4c' and
            normalized_id(site_placeholder['Parent']) == 'e601261f-f47f-4831-b91e-ef70efab3276',
            f'{key} must use the native SXA site Placeholder template and owned settings folder.')
    require(field_value(site_placeholder.get('SharedFields', []), 'Placeholder Key') == setting_key and
            id_list(field_value(site_placeholder.get('SharedFields', []), 'Allowed Controls')) ==
            [normalized_id(manifest['renderingIds'][component])],
            f'Site authoring restriction {key} must permit only {component}.')

article_rendering = paths['/sitecore/layout/Renderings/Project/LibertyMutual/ResourceArticle']
require(field_value(article_rendering.get('SharedFields', []), 'OtherProperties') == 'IsRenderingsWithDynamicPlaceholders=true',
        'ResourceArticle must enable the native SXA dynamic placeholder resolver.')

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
    'ResourceImage': ['ResourcePage'],
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
        if expected_layout == 'ResourceArticleLayout':
            allowed_components.add('ResourceImage')
        for rendering_uid, attributes in device['renderings'].items():
            name = rendering_names.get(attributes.get('id'))
            require(name in allowed_components,
                    f'{label}: rendering {rendering_uid} ({name}) is not allowed by {expected_layout}.')
            expected_placeholder = '/headless-resource-article/headless-resource-image-1' if name == 'ResourceImage' else PLACEMENTS[name]
            require(attributes.get('ph') == expected_placeholder,
                    f'{label}: {name} must use {expected_placeholder}, got {attributes.get("ph")}.')


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
