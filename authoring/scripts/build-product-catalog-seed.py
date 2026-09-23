#!/usr/bin/env python3
"""Create the additive product-page model, blank branch, and product references.

Only missing serialized items are created. Existing content, reference labels,
and editable branch snapshots are preserved; conflicting model definitions fail
before any write. --check is read-only. Initial content uses separate CreateOnly
modules, outside authoring resource packages. This script never connects to
Sitecore, changes existing page templates/layouts, pushes, or publishes.
"""
from pathlib import Path
import argparse
import importlib.util
import json
import re
import sys
import xml.etree.ElementTree as ET

import yaml

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('product_catalog_helpers', Path(__file__).with_name('build-product-spotlight-seed.py'))
helpers = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helpers)
uid, field, item, brace, serialize = helpers.uid, helpers.field, helpers.item, helpers.brace, helpers.serialize

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / 'authoring/items/liberty-mutual'
SITE = helpers.SITE
TEMPLATES = helpers.TEMPLATES
PAGE = TEMPLATES + '/ProductPage'
REFERENCE = TEMPLATES + '/ProductReference'
CATALOG = SITE + '/Data/ProductCatalog'
PRODUCTS = CATALOG + '/Products'
BRANCH = SITE + '/Presentation/Page Branches/Product page'
PROTOTYPE = BRANCH + '/$name'
DATA = PROTOTYPE + '/Data'
RENDERING = '/sitecore/layout/Renderings/Project/LibertyMutual/ProductDetails'
LAYOUT = '/sitecore/layout/Layouts/Project/LibertyMutual/ProductPageLayout'
KEY = 'headless-product-details'
PLACEHOLDER = '/sitecore/layout/Placeholder Settings/Project/LibertyMutual/' + KEY
SITE_PLACEHOLDER = SITE + '/Presentation/Placeholder Settings/' + KEY
VARIANT = SITE + '/Presentation/Headless Variants/ProductDetails'
DATA_TEMPLATE = '1c82e550-ebcd-4e5d-8abd-d50d0809541e'
FOLDER_TEMPLATE = 'a87a00b1-e6db-45ab-8b54-636fec3b5523'
WORKFLOW = 'b4f49b23-4bba-4c79-ba22-f89f5f0d4e4f'
DRAFT = '57cc7dce-e6b1-4564-9581-0e5850b8bdf2'
TITLE = 'd3bed2bd-a5f0-49ab-b7a5-6b72b0f34e4b'
FIELD_DEFINITIONS = [
    ('catalogSummary', 'Catalog summary', 'Multi-Line Text', '', 'A short introduction shown on the product catalog card.'),
    ('catalogImage', 'Catalog image', 'Image', '', 'Choose a product image and meaningful alternative text.'),
    ('catalogProducts', 'Related products', 'Multilist', PRODUCTS, 'Select existing operational products. This selection does not grant product or transaction access.'),
    ('catalogChannel', 'Distribution channel', 'Droplist', 'all|independent|wholesale', 'Choose the audience for this page: all, independent, or wholesale. Operational permissions remain separate.'),
    ('catalogBody', 'Product details', 'Rich Text', 'query:$xaRichTextProfile', 'Author the product guidance shown on this page. Do not include private customer or agency data.'),
]


def branch_layout():
    return (f'<r><d id="{{FE5D7FDF-89C0-4D99-9AA3-B5FBD009C9F3}}" l="{brace(uid(LAYOUT))}">'
            f'<r uid="{brace(uid(PROTOTYPE + "/rendering/ProductDetails"))}" id="{brace(uid(RENDERING))}" '
            f'ph="{KEY}" ds="$id" par="FieldNames={brace(uid(VARIANT + "/Default"))}" /></d></r>')


def branch_rule(products_page_id):
    return (f'<rule uid="{brace(uid(BRANCH + "/insert-rule"))}" name="Product page beneath Products">'
            f'<conditions><condition id="{{4F5389E9-79B7-4FE1-A43A-EEA4ECD19C94}}" '
            f'uid="{brace(uid(BRANCH + "/condition"))}" operatorid="{{066602E2-ED1D-44C2-A698-7ED27FD3A2CC}}" '
            f'value="{brace(products_page_id)}" /></conditions><actions>'
            f'<action id="{{D46EC8E5-7B46-47DE-B44A-4C5C30EF48D1}}" uid="{brace(uid(BRANCH + "/action"))}" '
            f'PageBranchId="{brace(uid(BRANCH))}" /></actions></rule>')


def records(manifest, products):
    result = []
    for path, base in [(PAGE, manifest['templateIds']['PortalPage']), (REFERENCE, '1930bbeb-7805-471a-a3be-4858ac7cf696')]:
        result.append(item(path, '94b480f8-5b0a-4487-99bb-238569489481', 'ab86861a-6030-46c5-b394-e8f99e8b87db', shared=[
            field('12c33f3f-86c5-43a5-aeb4-5598cec45116', '__Base template', brace(base)),
            field('06d5295c-ed2f-4a54-9bf2-26228d113318', '__Icon', 'Office/32x32/document_text.png'),
            field('f7d48a55-2158-4f02-9356-756654404f73', '__Standard values', brace(uid(path + '/__Standard Values'))),
        ]))
        result.append(item(path + '/__Standard Values', uid(path), uid(path),
            shared=[field('1172f251-dad4-4efb-a329-0c63500e4f1e', '__Masters', brace(DATA_TEMPLATE)),
                    field('f1a1fe9e-a60c-4ddb-a3a0-bb5b29fe732e', '__Renderings', branch_layout())] if path == PAGE else None,
            values=[field(TITLE, 'Title', '$name'),
                    field(uid('field/ProductPage/catalogChannel'), 'catalogChannel', 'all')] if path == PAGE else None))
        section = path + '/Content'
        result.append(item(section, uid(path), 'e269fbb5-3750-427a-9149-7aa950b49301'))
        definitions = FIELD_DEFINITIONS if path == PAGE else [
            ('productId', 'Product ID', 'Single-Line Text', '', 'Stable identifier of an existing operational product. Its availability is controlled by the application.')]
        for index, (name, label, kind, source, description) in enumerate(definitions, 1):
            shared = [field('ab162cc0-dc80-4abf-8871-998ee5d7ba32', 'Type', kind),
                      field('ba3f86a2-4a1c-4d78-b63d-91c2779c1b5e', '__Sortorder', index * 100)]
            if source:
                shared.append(field('1eb8ae32-e190-44a6-968d-ed904c794ebf', 'Source', source))
            result.append(item(section + '/' + name, uid(section), '455a3e98-a627-4b40-8035-e683a0331ac7',
                identifier=uid('field/' + path.rsplit('/', 1)[-1] + '/' + name), shared=shared, language_fields=[
                    field('19a69332-a23e-4e70-8d16-b2640cb24cc8', 'Title', label),
                    field('b5e02ad9-d56f-4c41-a065-a133db87bdeb', '__Display name', label),
                    field('9541e67d-ce8c-4225-803d-33f7f29f09ef', '__Short description', description),
                ]))
    result.append(item(RENDERING, '705f29fc-a5de-489e-9e2e-2dac8e03d084', '04646a89-996f-4ee7-878a-ffdbf1f0ef0d', shared=[
        field('037fe404-dd19-4bf7-8e30-4dadf68b27b0', 'componentName', 'ProductDetails'),
        field('1a7c85e5-dc0b-490d-9187-bb1dbcb4c72f', 'Datasource Template', PAGE),
        field('b5b27af1-25ef-405c-87ce-369b3a004016', 'Datasource Location', ''),
        field('a3411ff6-c978-40aa-b059-a49b9ca2209b', 'Can select Page as a data source', '1'),
        field('a77e8568-1ab3-44f1-a664-b7c37ec7810d', 'Parameters Template', brace(manifest['templateIds']['PortalRenderingParameters'])),
        field('06d5295c-ed2f-4a54-9bf2-26228d113318', '__Icon', 'Office/32x32/document_text.png'),
        field('ba3f86a2-4a1c-4d78-b63d-91c2779c1b5e', '__Sortorder', '300'),
    ], language_fields=[field('b5e02ad9-d56f-4c41-a065-a133db87bdeb', '__Display name', 'Product details')],
        values=[field('1b58d065-fe74-43e3-ba20-54c9588b3011', 'AllowedOnTemplates', brace(uid(PAGE)))]))
    for path, parent, template in [
        (PLACEHOLDER, 'e26a2d36-9ee9-49df-bb07-0073d8e20ccc', '5c547d4e-7111-4995-95b0-6b561751bf2e'),
        (SITE_PLACEHOLDER, 'e601261f-f47f-4831-b91e-ef70efab3276', 'd2a6884c-04d5-4089-a64e-d27ca9d68d4c'),
    ]:
        result.append(item(path, parent, template, shared=[
            field('7256bdab-1fd2-49dd-b205-cb4873d2917c', 'Placeholder Key', KEY),
            field('e391b526-d0c5-439d-803e-17512eae6222', 'Allowed Controls', brace(uid(RENDERING))),
        ]))
    result.append(item(LAYOUT, uid('/sitecore/layout/Layouts/Project/LibertyMutual'), 'e4e11508-04a4-4b0b-a263-5201f811c9cd', shared=[
        field('a036b2bc-ba04-44f6-a75f-bae6cd242abf', 'Path', '/Views/SXA JSS/SXA JSS Layout.cshtml'),
        field('80334869-86dc-4472-aa89-44cf1b2f6c9b', 'Placeholders', brace(uid(PLACEHOLDER))),
    ]))
    result.append(item(VARIANT, '19a63bdd-f9c6-403b-8068-c1884e9bb413', '49c111d0-6867-4798-a724-1f103166e6e9'))
    result.append(item(VARIANT + '/Default', uid(VARIANT), '4d50cdae-c2d9-4de8-b080-8f992bfb1b55'))
    result.append(item(CATALOG, '20e904a1-9b60-43a1-a8d0-8e3aee45b115', FOLDER_TEMPLATE))
    result.append(item(PRODUCTS, uid(CATALOG), FOLDER_TEMPLATE, shared=[
        field('1172f251-dad4-4efb-a329-0c63500e4f1e', '__Masters', brace(uid(REFERENCE))),
    ]))
    for index, product in enumerate(products, 1):
        result.append(item(PRODUCTS + '/' + product['id'], uid(PRODUCTS), uid(REFERENCE),
            shared=[field('ba3f86a2-4a1c-4d78-b63d-91c2779c1b5e', '__Sortorder', index * 100)],
            language_fields=[field('b5e02ad9-d56f-4c41-a065-a133db87bdeb', '__Display name', product['name'])],
            values=[field(uid('field/ProductReference/productId'), 'productId', product['id'])]))
    result.append(item(BRANCH, '303950e1-bb10-4155-b993-9435c33f9aeb', '35e75c72-4985-4e09-88c3-0eac6cd1e64f'))
    result.append(item(PROTOTYPE, uid(BRANCH), uid(PAGE), shared=[
        field('1172f251-dad4-4efb-a329-0c63500e4f1e', '__Masters', brace(DATA_TEMPLATE)),
        field('f1a1fe9e-a60c-4ddb-a3a0-bb5b29fe732e', '__Renderings', branch_layout()),
        field('a4f985d9-98b3-4b52-aaaf-4344f6e747c6', '__Workflow', brace(WORKFLOW)),
    ], values=[field(TITLE, 'Title', '$name'),
        field('4e0720e9-9d50-4ddc-87cf-ecd65e8e94c8', 'NavigationTitle', '$name'),
        field('3e431de1-525e-47a3-b6b0-1ccbec3a8c98', '__Workflow state', brace(DRAFT)),
        *[field(uid('field/ProductPage/' + name), name, 'all' if name == 'catalogChannel' else '')
          for name, *_ in FIELD_DEFINITIONS],
    ]))
    result.append(item(DATA, uid(PROTOTYPE), DATA_TEMPLATE))
    return result


def file_for(record):
    path = record['Path']
    if path == BRANCH or path.startswith(BRANCH + '/'):
        return BASE / 'items/product-page-branch' / ('Product page' + path[len(BRANCH):].replace('$', '#') + '.yml')
    if path == CATALOG or path.startswith(CATALOG + '/'):
        return BASE / 'items/product-catalog' / (path.removeprefix(SITE + '/Data/') + '.yml')
    if path == SITE_PLACEHOLDER:
        return BASE / 'items/site-product-details' / (KEY + '.yml')
    for kind, prefix in [('templates', '/sitecore/templates/Project/'), ('renderings', '/sitecore/layout/Renderings/Project/'),
                         ('placeholders', '/sitecore/layout/Placeholder Settings/Project/'), ('layouts', '/sitecore/layout/Layouts/Project/'),
                         ('content', '/sitecore/content/')]:
        if path.startswith(prefix):
            return BASE / 'items' / kind / (path[len(prefix):] + '.yml')
    raise ValueError('Item is outside the owned product catalog roots: ' + path)


def fields_by_id(record):
    result = {('shared', f['ID']): str(f.get('Value') or '') for f in record.get('SharedFields', [])}
    for language in record.get('Languages', []):
        for f in language.get('Fields', []):
            result[(language['Language'], f['ID'])] = str(f.get('Value') or '')
        for version in language.get('Versions', []):
            for f in version.get('Fields', []):
                if f['Hint'] != '__Created':
                    result[(language['Language'], version['Version'], f['ID'])] = str(f.get('Value') or '')
    return result


def prepare():
    """Validate everything and return writes without touching existing content."""
    manifest_path = BASE / 'content-manifest.json'
    before = {manifest_path: manifest_path.read_text()}
    manifest = json.loads(before[manifest_path])
    if manifest['site'] != SITE or manifest['templateIds']['PortalPage'] != 'd8e5d742-1ae3-5b2e-aba9-553d4a53c3fc':
        raise ValueError('Unexpected site or base page template in the content manifest.')
    products = json.loads((ROOT / 'examples/liberty-mutual-agent-portal/fixtures/products.json').read_text())
    if len(products) != 18 or len({p['id'] for p in products}) != len(products) or any(
            not re.fullmatch('[a-z0-9]+(?:-[a-z0-9]+)*', p['id']) or not p['name'].strip() for p in products):
        raise ValueError('Expected 18 distinct operational products with stable IDs and readable names.')
    additions = records(manifest, products)
    writes = {}
    for record in additions:
        destination = file_for(record)
        if destination.exists():
            existing = yaml.safe_load(destination.read_text(encoding='utf-8-sig'))
            if any(existing.get(key) != record[key] for key in ['ID', 'Parent', 'Template', 'Path']):
                raise ValueError('Existing item identity differs: ' + str(destination))
            if not record['Path'].startswith(SITE + '/') or record['Path'] == SITE_PLACEHOLDER:
                actual = fields_by_id(existing)
                if any(actual.get(key) != value for key, value in fields_by_id(record).items()):
                    raise ValueError('Existing model differs; preserve and review it: ' + str(destination))
        else:
            writes[destination] = serialize(record)
    updates = {
        'templateIds': {'ProductPage': uid(PAGE), 'ProductReference': uid(REFERENCE)},
        'fieldIds': {'ProductPage.' + name: uid('field/ProductPage/' + name) for name, *_ in FIELD_DEFINITIONS},
        'renderingIds': {'ProductDetails': uid(RENDERING)},
        'placeholderIds': {KEY: uid(PLACEHOLDER)},
        'sitePlaceholderIds': {KEY: uid(SITE_PLACEHOLDER)},
        'layoutIds': {'ProductPageLayout': uid(LAYOUT)},
    }
    updates['fieldIds']['ProductReference.productId'] = uid('field/ProductReference/productId')
    for group, values in updates.items():
        helpers.merge_new_entries(manifest.setdefault(group, {}), values)
    generated = [str(file_for(record).relative_to(ROOT)) for record in additions]
    manifest['generatedFiles'].extend(path for path in generated if path not in manifest['generatedFiles'])
    if json.loads(before[manifest_path]) != manifest:
        writes[manifest_path] = json.dumps(manifest, indent=2) + '\n'
    contract = {
        'schemaVersion': 1, 'site': SITE, **updates,
        'catalogRoot': CATALOG, 'productsRoot': PRODUCTS, 'branchPath': BRANCH,
        'prototypePath': PROTOTYPE, 'dataPath': DATA, 'placeholderKey': KEY,
        'ids': {'branch': uid(BRANCH), 'prototype': uid(PROTOTYPE), 'data': uid(DATA),
                'branchFolder': '303950e1-bb10-4155-b993-9435c33f9aeb', 'catalog': uid(CATALOG),
                'products': uid(PRODUCTS), 'variant': uid(VARIANT + '/Default'),
                'pageDefaults': uid(PAGE + '/__Standard Values'), 'productsPage': manifest['routePageIds']['products']},
        'branchLayout': branch_layout(), 'branchInsertRule': '<ruleset>' + branch_rule(manifest['routePageIds']['products']) + '</ruleset>',
        'branchRuleId': uid(BRANCH + '/insert-rule'),
        'branchRuleFieldId': 'bb3391dd-f8be-4b2e-ae9f-47bb63c166ce',
        'productReferences': [{'id': uid(PRODUCTS + '/' + p['id']), 'productId': p['id'], 'displayName': p['name']} for p in products],
        'generatedFiles': generated,
        'deploymentScope': 'Additive model and CreateOnly initial references/branch. Configure the branch insertion rule and component library separately. Existing pages and shared layouts are preserved.',
    }
    ET.fromstring(contract['branchLayout'])
    ET.fromstring(contract['branchInsertRule'])
    contract_path = BASE / 'product-catalog-authoring-manifest.json'
    if contract_path.exists():
        if json.loads(contract_path.read_text()) != contract:
            raise ValueError('Existing product catalog manifest differs; preserve and review it.')
    else:
        writes[contract_path] = json.dumps(contract, indent=2) + '\n'
    for namespace, name, path, description in [
        ('ProductPageBranch', 'product-page-branch', BRANCH, 'Editable blank Product page branch. CreateOnly; excluded from authoring resource packages.'),
        ('ProductCatalog', 'product-catalog', CATALOG, 'Initial operational product references. CreateOnly preserves author labels; excluded from authoring resource packages.'),
    ]:
        module = {'$schema': '../../../.sitecore/schemas/ModuleFile.schema.json', 'namespace': 'LibertyMutual.' + namespace,
                  'description': description, 'items': {'includes': [{'name': name, 'path': path, 'allowedPushOperations': 'CreateOnly'}]}}
        path = BASE / ('LibertyMutual.' + namespace + '.module.json')
        if path.exists():
            if json.loads(path.read_text()) != module:
                raise ValueError('Existing product module differs; preserve and review it: ' + str(path))
        else:
            writes[path] = json.dumps(module, indent=2) + '\n'
    for filename in ['LibertyMutual.SitePresentation.module.json', 'LibertyMutual.Content.module.json']:
        path = BASE / filename
        before[path] = path.read_text()
        module = json.loads(before[path])
        if filename == 'LibertyMutual.SitePresentation.module.json':
            addition = {'name': 'site-product-details', 'path': SITE_PLACEHOLDER, 'scope': 'SingleItem', 'allowedPushOperations': 'CreateAndUpdate'}
            includes = module['items']['includes']
            matches = [entry for entry in includes if entry['path'] == SITE_PLACEHOLDER or entry['name'] == addition['name']]
            if matches and matches != [addition]:
                raise ValueError('Existing site product placeholder scope differs.')
            if not matches:
                includes.append(addition)
                module['description'] = 'Exact SXA site placeholder restriction items. Developer-owned placement rules only; no editorial pages.'
        else:
            includes = module['items']['includes']
            if len(includes) != 1 or includes[0]['path'] != '/sitecore/content/LibertyMutual' or includes[0]['allowedPushOperations'] != 'CreateOnly':
                raise ValueError('Unexpected initial content module scope.')
            for owned in [SITE_PLACEHOLDER, BRANCH, CATALOG]:
                addition = {'path': owned.removeprefix('/sitecore/content/LibertyMutual'), 'scope': 'Ignored'}
                matches = [rule for rule in includes[0]['rules'] if rule['path'] == addition['path']]
                if matches and matches != [addition]:
                    raise ValueError('Existing product content exclusion differs.')
                if not matches:
                    includes[0]['rules'].append(addition)
        if json.loads(before[path]) != module:
            writes[path] = json.dumps(module, indent=2) + '\n'
    return additions, before, writes


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Validate without writing files.')
    args = parser.parse_args()
    additions, before, writes = prepare()
    if args.check:
        if writes:
            raise ValueError('Product catalog serialization or metadata is missing: ' + ', '.join(str(p.relative_to(ROOT)) for p in writes))
        print(f'Checked {len(additions)} product catalog items, field definitions, and isolated module scopes. No files modified.')
        return
    if any(path.read_text() != value for path, value in before.items()):
        raise ValueError('Manifest or module changed during preparation; review concurrent work before retrying.')
    for path, value in writes.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open('w' if path in before else 'x', encoding='utf-8') as handle:
            handle.write(value)
    print(f'Prepared {len(additions)} additive product catalog items; wrote {len(writes)} missing files or narrow metadata additions. Existing content preserved; no native operations performed.')


if __name__ == '__main__':
    main()
