#!/usr/bin/env python3
"""Read-only checks for the owned content seed and synthetic UDL import contract."""
from pathlib import Path
import hashlib
import json
import re
import uuid

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

print(f'Validated {len(items)} scoped items, {len(resources)} native resources, and {len(records)} UDL profile identities. No files modified.')
