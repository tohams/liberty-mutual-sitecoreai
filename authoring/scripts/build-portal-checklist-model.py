#!/usr/bin/env python3
"""Update only Portal native checklist definitions, runtime identities, and seed values.

Offline only. No CMS connection, deployment, publication, or restored content.
Run after the explicit taxonomy source refresh. --check verifies without writes.
"""
import argparse
import json
import re
import uuid
from pathlib import Path
import yaml
from portal_checklist_model import ROOT, SITE, NAMESPACE, CHECKLISTS, taxonomy, checklist_value

BASE = ROOT / 'authoring/items/liberty-mutual'
MODEL = json.loads((ROOT / 'examples/liberty-mutual-agent-portal/src/data/resource-metadata-model.json').read_text())
FIELD_IDS = {'Type': 'ab162cc0-dc80-4abf-8871-998ee5d7ba32', 'Source': '1eb8ae32-e190-44a6-968d-ed904c794ebf', 'Title': '19a69332-a23e-4e70-8d16-b2640cb24cc8', '__Display name': 'b5e02ad9-d56f-4c41-a065-a133db87bdeb', '__Short description': '9541e67d-ce8c-4225-803d-33f7f29f09ef'}

class Dumper(yaml.SafeDumper):
    pass

def represent(dumper, value):
    return dumper.represent_scalar('tag:yaml.org,2002:str', value, style='|' if '\n' in value else '"' if value == '' else None)
Dumper.add_representer(str, represent)

def serialize(record):
    text = yaml.dump(record, Dumper=Dumper, sort_keys=False, allow_unicode=True, width=100000).replace(': |-\n', ': |\n')
    text = re.sub(r"(?m)^(\s*(?:- )?[^:\n]+: )('.*')$", lambda m: m[1] + json.dumps(yaml.safe_load(m[2]), ensure_ascii=False), text)
    text = re.sub(r'(?m)^(\s*Value:) ""$', r'\1', text)
    return '---\n' + text

def update(fields, name, value):
    existing = next((entry for entry in fields if entry['Hint'] == name), None)
    if existing:
        existing['Value'] = value
    else:
        fields.append({'ID': FIELD_IDS[name], 'Hint': name, 'Value': value})

def outputs():
    out = {}
    for definition in MODEL['fields']:
        name = definition['name']
        path = BASE / 'items/templates/LibertyMutual/ResourcePage/Content' / (name + '.yml')
        record = yaml.safe_load(path.read_text())
        if record['ID'] != definition['fieldId']:
            raise ValueError('Preserve the existing Portal metadata identities.')
        label, kind, help_text, source = CHECKLISTS[name]
        update(record['SharedFields'], 'Type', kind)
        update(record['SharedFields'], 'Source', source)
        for language in record['Languages']:
            for key, value in [('Title', label), ('__Display name', label), ('__Short description', help_text)]:
                update(language.setdefault('Fields', []), key, value)
        out[path] = serialize(record)
    runtime = taxonomy()
    # Decode historical published layout references while the old choice is retired.
    runtime['product'].append({'id': str(uuid.uuid5(NAMESPACE, SITE + '/Data/Taxonomy/Products/auto-home')), 'value': 'auto-home', 'label': 'Auto & home'})
    out[ROOT / 'examples/liberty-mutual-agent-portal/src/data/resource-taxonomy-options.json'] = json.dumps(runtime, indent=2, ensure_ascii=False) + '\n'
    resource_template = MODEL['model']['resourceTemplateId']
    for path in (BASE / 'items/content').rglob('*.yml'):
        raw = path.read_text(encoding='utf-8-sig')
        matched = re.search(r'(?m)^Template: (.+)$', raw)
        if not matched or str(yaml.safe_load(matched[1])).lower() != resource_template.lower():
            continue
        record = yaml.safe_load(re.sub(r'(?m)^(\s*Value: )\*\s*$', r'\1"*"', raw))
        for language in record.get('Languages', []):
            for version in language.get('Versions', []):
                for field in version.get('Fields', []):
                    if field['Hint'] in CHECKLISTS:
                        encoded = checklist_value(field['Hint'], field.get('Value') or '')
                        field['Value'] = encoded.replace('|', '\n') + ('\n' if '|' in encoded else '')
        out[path] = serialize(record)
    return out

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    planned = outputs()
    drift = [str(path.relative_to(ROOT)) for path, value in planned.items() if not path.exists() or path.read_text() != value]
    if args.check and drift:
        raise SystemExit('Portal checklist source drift: ' + ', '.join(drift))
    if not args.check:
        for path, value in planned.items():
            if not path.exists() or path.read_text() != value:
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(value)
    print(('Verified' if args.check else 'Prepared') + f' {len(planned)} Portal checklist model/seed files. No native operations.')

if __name__ == '__main__':
    main()
