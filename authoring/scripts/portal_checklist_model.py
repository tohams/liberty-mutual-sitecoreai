"""Native Portal checklist definitions and deterministic CreateOnly seed values."""
from pathlib import Path
import json
import uuid

ROOT = Path(__file__).resolve().parents[2]
SITE = '/sitecore/content/LibertyMutual/liberty-mutual-agent-portal'
NAMESPACE = uuid.UUID('4a098fe0-ad6b-4722-9862-4e56b855337a')
CHECKLISTS = {
    'state': ('Risk states', 'Checklist', 'Select the states covered by this resource, or Cross-state guidance on its own.', SITE + '/Data/Taxonomy/Risk states'),
    'businessFamily': ('Business families', 'Checklist', 'Select the business families covered by this resource.', SITE + '/Data/Taxonomy/Business families'),
    'product': ('Products', 'Checklist', 'Select the products covered by this resource.', SITE + '/Data/Taxonomy/Products'),
    'channel': ('Distribution channels', 'Checklist', 'Select the channels for which this resource is written.', SITE + '/Data/Taxonomy/Distribution channels'),
    'resourceType': ('Resource types', 'Checklist', 'Select the kinds of guidance this resource provides.', SITE + '/Data/Taxonomy/Resource types'),
}

def taxonomy():
    source = json.loads((ROOT / 'authoring/items/liberty-mutual/resource-taxonomy.json').read_text())
    return {entry['field']: [{
        'id': str(uuid.uuid5(NAMESPACE, SITE + '/Data/Taxonomy/' + entry['folder'] + '/' + option['name'])),
        'value': option['name'], 'label': option['displayName'],
    } for option in entry['options']] for entry in source['taxonomies']}

def checklist_value(name, raw):
    """Encode authored seed tokens or existing native references without defaults."""
    if not raw.strip():
        return ''
    choices = taxonomy()[name]
    by_name = {choice['value']: choice for choice in choices}
    by_id = {choice['id']: choice for choice in choices}
    selected = set()
    for token in raw.replace('|', ',').replace('\n', ',').split(','):
        token = token.strip()
        if not token:
            continue
        if name == 'product' and token == 'auto-home':
            selected.update(['auto', 'home'])
            continue
        if token in by_name:
            selected.add(token)
            continue
        try:
            selected.add(by_id[str(uuid.UUID(token.strip('{}')))]['value'])
        except (ValueError, KeyError):
            raise ValueError('Unknown Portal checklist value: ' + name)
    if name == 'state' and 'All' in selected and len(selected) != 1:
        raise ValueError('Cross-state guidance cannot be combined with specific states.')
    return '|'.join('{' + choice['id'].upper() + '}' for choice in choices if choice['value'] in selected)
