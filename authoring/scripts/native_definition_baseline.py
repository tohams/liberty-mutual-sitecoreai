"""Bounded compatibility for17 existing developer-owned native definitions.

This does not fetch CMS data or admit unknown changes. A generator must still
produce its recorded pre-reconciliation fields. The exact native definition
then preserves canonical SCS formats, versions, and metadata. Changes to those
fields require an explicit baseline/model review instead of silent overwrite.
"""
from pathlib import Path
import copy,json,re,xml.etree.ElementTree as E
BASE=Path(__file__).resolve().parents[1]/'items/liberty-mutual/native-definition-baseline.json'
def _fields(record):
    result={('shared',f['ID'].lower()):f for f in record.get('SharedFields',[])}
    for lang in record.get('Languages',[]):
        result.update({(lang['Language'],f['ID'].lower()):f for f in lang.get('Fields',[])})
        for version in lang.get('Versions',[]):
            result.update({(lang['Language'],version['Version'],f['ID'].lower()):f for f in version.get('Fields',[])})
    return result
def _semantic(value):
    text='' if value is None else str(value);text=text.replace('\r\n','\n')
    if re.fullmatch(r'\{[a-fA-F0-9-]{36}\}(?:[|\n]\{[a-fA-F0-9-]{36}\})*\n?',text):
        return ('ids',tuple(x.lower() for x in re.split(r'[|\n]',text) if x))
    if text.startswith(('<r>','<r ','<ruleset>')):
        def node(e):return (e.tag,tuple(sorted(e.attrib.items())),(e.text or '').strip(),tuple(node(c) for c in e))
        return ('xml',node(E.fromstring(text)))
    return text
def reconcile_definition(record):
    if not BASE.exists():return record
    entry=json.loads(BASE.read_text())['records'].get(record['Path'])
    if not entry:return record
    previous,native=entry['previous'],entry['native']
    if any(record.get(k)!=previous[k] for k in ['ID','Parent','Template','Path']):
        raise ValueError('Native definition identity changed; review baseline: '+record['Path'])
    old=_fields(previous)
    for key,field in _fields(record).items():
        if key not in old or field['Hint']!=old[key]['Hint'] or _semantic(field.get('Value'))!=_semantic(old[key].get('Value')):
            raise ValueError('Generated native definition field changed; review baseline: '+record['Path']+'/'+field['Hint'])
    return copy.deepcopy(native)
def same_definition_semantics(before,after):
    if any(before.get(k)!=after.get(k) for k in ['ID','Parent','Template','Path']):return False
    inventory=lambda r:sorted((l['Language'],tuple(v['Version'] for v in l.get('Versions',[]))) for l in r.get('Languages',[]))
    if inventory(before)!=inventory(after):return False
    a,b=_fields(before),_fields(after)
    return a.keys()==b.keys() and all(a[k]['Hint']==b[k]['Hint'] and _semantic(a[k].get('Value'))==_semantic(b[k].get('Value')) for k in a)
