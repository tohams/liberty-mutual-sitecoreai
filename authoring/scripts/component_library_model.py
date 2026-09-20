"""Shared author-facing component metadata; runtime component identities stay stable."""
from pathlib import Path
import json
import sys

sys.dont_write_bytecode = True

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = json.loads((ROOT / 'authoring/items/liberty-mutual/component-library-manifest.json').read_text())


def apply_rendering_metadata(record):
    """Apply only icon, sort order, and the English display name."""
    name = record['Path'].rsplit('/', 1)[-1]
    spec = MANIFEST['renderings'][name]
    if record['ID'].lower() != spec['itemId'].lower() or record['Path'] != spec['path']:
        raise ValueError('Component library metadata must preserve rendering identity: ' + name)
    fields = MANIFEST['fields']
    def put(target, key, hint, value):
        field = {'ID': fields[key], 'Hint': hint, 'Value': str(value)}
        for index, existing in enumerate(target):
            if existing['ID'].lower() == fields[key].lower():
                target[index] = field
                return
        target.append(field)
    shared = record.setdefault('SharedFields', [])
    put(shared, 'icon', '__Icon', spec['icon'])
    put(shared, 'sort', '__Sortorder', spec['sortOrder'])
    language = next((lang for lang in record.setdefault('Languages', []) if lang['Language'] == 'en'), None)
    if language is None:
        language = {'Language': 'en'}
        record['Languages'].append(language)
    put(language.setdefault('Fields', []), 'display', '__Display name', spec['displayName'])
    # Native SCS writes unversioned fields before its version collection.
    record['Languages'] = [{key: lang[key] for key in ('Language', 'Fields', 'Versions') if key in lang}
                           for lang in record['Languages']]
    return record
