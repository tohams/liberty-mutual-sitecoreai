#!/usr/bin/env python3
"""Prepare the /bundling-only fidelity change, offline.

The reference is an explicitly supplied HTML capture. Existing editorial items
are proposed as new reviewed versions, never overwritten by a normal release.
Media placeholders are a separate binding list, not fabricated Image fields.
"""
from pathlib import Path
import argparse, copy, html, importlib.util, json, re, sys
sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / 'authoring/items/liberty-mutual-public'
SITE = '/sitecore/content/LibertyMutual/liberty-mutual-public-site'
PAGE = SITE + '/Home/bundling'
DATA = PAGE + '/Data'
spec = importlib.util.spec_from_file_location('bundling_model', Path(__file__).with_name('public-build-model.py'))
h = importlib.util.module_from_spec(spec); spec.loader.exec_module(h)

ASSETS = [
    ('bundle-family-loading', 'loading_musical_instrument_672_552png.png', 'Dad helping daughter pack the back of a SUV', 'https://public.libertymutual-cdn.com/lm-media-assets/content-images/dmlp/loading_musical_instrument_672_552png.png'),
    ('bundle-mobile-app', 'mobile-app-phone.jpg', 'Liberty Mutual mobile app on a phone', 'https://public.libertymutual-cdn.com/lm-media-assets/content-images/products/auto/car/mobile-app-phone.jpg'),
    ('bundle-related-home', 'when-to-buy-homeowners-insurance.jpg', 'Front door on a white house with a wraparound porch', 'https://public.libertymutual-cdn.com/lm-media-assets/content-images/products/property/articles/when-to-buy-homeowners-insurance.jpg?width=250&height=200'),
    ('bundle-related-car', 'SaveOnCarInsurance.jpg', 'The front ends of cars in a line', 'https://public.libertymutual-cdn.com/lm-media-assets/content-images/products/auto/articles/SaveOnCarInsurance.jpg?width=250&height=200'),
    ('bundle-related-coverage', 'what-is-not-covered-by-home-insurance.jpg', 'Kids playing on a trampoline', 'https://public.libertymutual-cdn.com/lm-media-assets/content-images/products/property/articles/what-is-not-covered-by-home-insurance.jpg'),
    ('bundle-related-switch', 'article-switch-car-insurance-companies.jpg', 'Two people laughing after working on a car', 'https://public.libertymutual-cdn.com/lm-media-assets/content-images/products/auto/articles/article-switch-car-insurance-companies.jpg?width=250&height=200'),
]

def fields(record):
    return {f['Hint']: f['Value'] for f in [*record.get('SharedFields', []), *record['Languages'][0]['Versions'][0]['Fields']]}

def prepare(reference_html, bindings=None):
    bindings = bindings or {}
    model = json.loads((BASE / 'public-contract.json').read_text())
    seed = json.loads((BASE / 'public-editorial-records.json').read_text())
    extensions = json.loads((BASE / 'public-model-extensions.json').read_text())
    original = {r['Path']: copy.deepcopy(r) for r in seed['records']}
    records = {r['Path']: copy.deepcopy(r) for r in seed['records']}
    changes, media = [], []

    def change(path, values):
        record = records[path]
        group = record['Languages'][0]['Versions'][0]['Fields']
        by_name = {f['Hint']: f for f in group}
        for key, value in values.items():
            if key in by_name:
                by_name[key]['Value'] = value
            else:
                by_name[key] = h.field(model['fieldIds'][template_names[record['Template']] + '.' + key], key, value)
        record['Languages'][0]['Versions'][0]['Fields'] = list(by_name.values())

    template_names = {value: key for key, value in model['templateIds'].items()}
    def create(path, kind, values):
        if path in records:
            change(path, values)
            return h.uid(path)
        records[path] = {
            'ID': h.uid(path), 'Parent': h.uid(path.rsplit('/', 1)[0]),
            'Template': model['templateIds'][kind] if kind != 'Folder' else h.T['folder'], 'Path': path,
            'SharedFields': [] if kind == 'Folder' else [h.field(h.F['workflow'], '__Workflow', h.brace(model['workflow']['id']))],
            'Languages': [{'Language': 'en', 'Versions': [{'Version': 1, 'Fields':
                [h.field(model['fieldIds'][kind + '.' + key], key, value) for key, value in values.items()]
                + ([h.field(h.F['workflowState'], '__Workflow state', h.brace(model['workflow']['draft']))] if kind != 'Folder' else [h.field('25bed78c-4957-4165-998a-ca1b52f67497', '__Created', '20261112T000000Z')])
            }]}],
        }
        return h.uid(path)

    def media_field(path, key):
        media.append({'path': path, 'field': 'image', 'assetKey': key})
        value = bindings.get(key, '')
        assert not value or ('mediaid=' in value.lower() or 'dam-id=' in value.lower()), 'Use an actual uploaded native Image field binding.'
        return value

    def link(text, href): return h.link(text, href)
    def source_heading(pattern):
        return next((match for match in re.finditer(r'<h[23][^>]*>(.*?)</h[23]>', reference_html, re.S)
                     if re.search(html.unescape(pattern), html.unescape(re.sub(r'<[^>]*>', ' ', match[1])))), None)
    def rich_after_heading(pattern):
        heading = source_heading(pattern)
        assert heading, 'Missing reference heading: ' + pattern
        body = re.search(r'<div class="lm-Body[^\"]*"[^>]*>(.*?)</div>', reference_html[heading.end():], re.S)
        assert body, 'Missing reference body: ' + pattern
        content = body[1].strip()
        return content if content.startswith('<p') else '<p>' + content + '</p>'
    # Read the actual six public FAQs from the source's accessible FAQ schema.
    faq = None
    for attrs, body in re.findall(r'<script([^>]*)>(.*?)</script>', reference_html, re.S):
        if 'application/ld+json' in attrs:
            payload = json.loads(body)
            if payload.get('@type') == 'FAQPage': faq = payload['mainEntity']
    assert faq and len(faq) == 6, 'Expected the real six bundling questions in the supplied capture.'
    question_root = DATA + '/FAQs/Questions'
    old_question_paths = [
        question_root + '/01 What is an auto and home insurance bundle',
        question_root + '/02 Are bundling and multi-policy savings the sam',
        question_root + '/03 When is the best time to bundle',
        question_root + '/04 Can I add home insurance after buying an auto',
    ]
    ordered_questions = []
    for i, q in enumerate(faq):
        path = (old_question_paths[i] if i < 3 else old_question_paths[3] if i == 4 else
                question_root + ('/04 Renters discount after buying a home' if i == 3 else '/06 Canceling a bundled policy'))
        values = {'question': q['name'].strip(), 'answer': '<p>' + html.escape(q['acceptedAnswer']['text'].strip()) + '</p>'}
        ordered_questions.append(create(path, 'PublicFaqItem', values))
    # Use the visible accordion bodies, including the first FAQ's second
    # paragraph, rather than the source site's abbreviated schema excerpt.
    visible_answers = re.findall(r'<div class="lmig-Accordion-content">(\s*<p>.*?)</div></div></li>', reference_html, re.S)
    assert len(visible_answers) == 6, 'Expected all six visible source accordion bodies.'
    for identifier, answer in zip(ordered_questions, visible_answers):
        path = next(p for p, r in records.items() if r['ID'] == identifier)
        change(path, {'answer': answer.strip()})
    change(DATA + '/FAQs', {'items': '|'.join(map(h.brace, ordered_questions))})
    # A reusable section variant keeps the introduction, ordered jump links,
    # and independently editable native card fields together.
    intro_path = DATA + '/Bundle introduction'
    create(intro_path + '/Cards', 'Folder', {})
    intro_links = []
    source_jump_links = re.findall(r'<div class="HyperlinkBox_contentColumn__[^\"]+"><a[^>]+href="/bundling(#[^\"]+)"[^>]*>(.*?)</a><br/>(.*?)</div>', reference_html, re.S)
    assert len(source_jump_links) == 3
    for number, (destination, label, description) in enumerate(source_jump_links, 1):
        body = '<p>' + description + '</p>'
        path = intro_path + '/Cards/' + f'{number:02} ' + label
        intro_links.append(create(path, 'PublicCard', {'heading': label, 'body': body, 'image': '', 'value': '', 'actionLink': link(label, destination)}))
    overview = fields(records[DATA + '/Bundle overview'])
    overview['heading'] = re.sub(r'<h2[^>]*>', '<h2>', source_heading('Auto and home')[0])
    intro_start = source_heading('Auto and home').end()
    intro_end = reference_html.index('<div id="types-for-bundle"', intro_start)
    overview['body'] = ''.join(re.findall(r'<p[^>]*>.*?</p>', reference_html[intro_start:intro_end], re.S))
    assert overview['body']
    change(DATA + '/Bundle overview', {'body': overview['body']})
    create(intro_path, 'PublicSection', {'heading': overview['heading'], 'introduction': overview['body'], 'items': '|'.join(map(h.brace, intro_links)), 'actionLink': ''})
    multi_car = re.search(r'(We also offer a discount for insuring more than one car with us\..*?)</div>', reference_html, re.S)[1]
    create(DATA + '/Multi-car savings', 'PublicArticle', {'heading': '', 'body': '<p>' + multi_car + '</p><p><a href="https://www.libertymutual.com/vehicle/auto-insurance/discounts">View more discounts</a></p>'})
    create(DATA + '/Mobile app', 'PublicSplitContent', {
        'heading': '<h2>Get the Liberty Mutual app today!</h2><p>The fastest, easiest way to manage your insurance.</p>',
        'body': rich_after_heading('Get the Liberty Mutual app today!'),
        'image': media_field(DATA + '/Mobile app', 'bundle-mobile-app'),
        'primaryLink': link('Download the app to see how we help make insurance simple', 'https://www.libertymutual.com/mobile-app'), 'secondaryLink': '',
    })
    benefits = ''.join('<h3>' + label + '</h3>' + rich_after_heading(label) for label in ['Save money', "It&#x27;s more convenient", 'Flexibility'])
    change(DATA + '/Why bundle', {'image': media_field(DATA + '/Why bundle', 'bundle-family-loading'),
        'heading': '<h2>Why bundle auto and home insurance?</h2><p>Here are just a few reasons why it can help to bundle your insurance.</p>',
        'body': benefits, 'primaryLink': link('Bundle auto and home insurance to see how much you could save', '#bundling-quote')})
    change(DATA + '/How bundling works', {'body': rich_after_heading('How much can you save')})
    change(DATA + '/Bundle confidence', {'heading': '<h2>Why choose Liberty Mutual for<br>car insurance?</h2>', 'body': rich_after_heading('Why choose Liberty Mutual for')})
    change(DATA + '/Bundle choices', {'introduction': '<p>At Liberty Mutual, we offer the following insurance bundles</p>'})
    for card in [r for p, r in records.items() if p.startswith(DATA + '/Bundle choices/Cards/')]:
        title = fields(card)['heading']
        match = re.search(r'<div class="[^\"]*nonLinkHeading[^\"]*">' + re.escape(title) + r'</div>.*?<div class="lm-Body[^\"]*">(.*?)<a ', reference_html, re.S)
        assert match, title
        change(card['Path'], {'body': match[1].strip()})
    related_path = DATA + '/Related insurance guides'
    create(related_path + '/Cards', 'Folder', {})
    related = []
    for n, title, url, asset in [
        (1, 'When to buy homeowners insurance', '/insurance-resources/property/when-to-buy-homeowners-insurance', 'bundle-related-home'),
        (2, '13 ways to lower your car insurance rate', '/insurance-resources/auto/how-to-lower-your-car-insurance-rate', 'bundle-related-car'),
        (3, "What isn't covered by home insurance", '/insurance-resources/property/what-is-not-covered-by-homeowners-insurance', 'bundle-related-coverage'),
        (4, 'How to switch car insurance companies', '/insurance-resources/auto/how-to-switch-car-insurance-companies', 'bundle-related-switch'),
    ]:
        path = related_path + '/Cards/' + f'{n:02} ' + re.sub(r'[^\w\s-]', '', title)
        related.append(create(path, 'PublicCard', {'heading': title, 'body': '', 'value': '', 'image': media_field(path, asset), 'actionLink': link(title, 'https://www.libertymutual.com' + url)}))
    create(related_path, 'PublicSection', {'heading': '<h2>Learn more about auto and homeowners insurance</h2>', 'introduction': '', 'items': '|'.join(map(h.brace, related)), 'actionLink': ''})
    create(DATA + '/More coverage information', 'PublicArticle', {'heading': 'More about insurance coverage', 'body': '<p><a href="https://www.libertymutual.com/vehicle/auto-insurance/coverage">Auto coverage</a><a href="https://www.libertymutual.com/vehicle/auto-insurance/calculator">Auto coverage calculator</a><a href="https://www.libertymutual.com/property/homeowners-insurance/home-insurance-calculator">Home coverage calculator</a></p>'})
    source_footnotes = re.findall(r'<sup class="[^\"]*">([1-4])</sup><span class="[^\"]*text [^\"]*">(.*?)</span></div>', reference_html, re.S)
    assert len(source_footnotes) == 4
    change(DATA + '/Savings disclosure', {'title': '', 'body': ''.join('<p><sup>' + number + '</sup> ' + wording + '</p>' for number, wording in source_footnotes)})
    # Add only variants; the field and governance contracts do not change.
    definitions = []
    for component, variant, label in [('PublicSection', 'IntroductionLinks', 'Introduction and links'), ('PublicSection', 'RelatedArticles', 'Related articles'), ('PublicSplitContent', 'AppFeatures', 'App features'), ('PublicSplitContent', 'Benefits', 'Benefits')]:
        path = SITE + '/Presentation/Headless Variants/' + component + '/' + variant
        definition = {'ID': h.uid(path), 'Parent': h.uid(path.rsplit('/', 1)[0]), 'Template': h.T['variant'], 'Path': path, 'SharedFields': [h.field(h.F['sort'], '__Sortorder', '900')], 'Languages': [{'Language': 'en', 'Fields': [h.field(h.F['display'], '__Display name', label)], 'Versions': [{'Version': 1, 'Fields': [h.field('25bed78c-4957-4165-998a-ca1b52f67497', '__Created', '20261112T000000Z')]}]}]}
        definitions.append(definition)
        model['variantIds'][component + '.' + variant] = definition['ID']
    # Preserve existing rendering UIDs while adding local sections and anchors.
    page = records[PAGE]
    rendering_field = next(f for f in page['SharedFields'] if f['Hint'] == '__Renderings')
    layout = rendering_field['Value']
    rows = re.findall(r'<r\s[^>]*?/\s*>', layout)
    placements = []
    def placement(component, local_path, variant='Default', anchor=None):
        uid = h.uid(PAGE + '/rendering/bundling-fidelity/' + local_path)
        params = 'FieldNames=' + h.brace(model['variantIds'].get(component + '.' + variant, h.uid(SITE + '/Presentation/Headless Variants/' + component + '/' + variant))) + '&amp;DynamicPlaceholderId=' + str(30 + len(placements))
        if anchor: params += '&amp;RenderingIdentifier=' + anchor
        return '<r uid="' + h.brace(uid) + '" id="' + h.brace(model['renderingIds'][component]) + '" ph="/headless-main/sxa-public-page-body/headless-public-content-1" ds="page:/Data/' + local_path + '" par="' + params + '" />'
    for row in rows:
        ds = html.unescape(re.search(r'\bds="([^"]*)"', row)[1])
        if ds in ['page:/Data/Multi-car savings', 'page:/Data/Mobile app', 'page:/Data/Related insurance guides', 'page:/Data/More coverage information']:
            continue
        if ds in ['page:/Data/Bundle overview', 'page:/Data/Bundle introduction']:
            row = row.replace('page:/Data/Bundle overview', 'page:/Data/Bundle introduction').replace(h.brace(model['renderingIds']['PublicSplitContent']), h.brace(model['renderingIds']['PublicSection']))
            row = re.sub(r'FieldNames=\{[^}]+\}', 'FieldNames=' + h.brace(model['variantIds']['PublicSection.IntroductionLinks']), row)
        anchor = {'page:/Data/Quote choices': 'bundling-quote', 'page:/Data/Bundle choices': 'types-for-bundle', 'page:/Data/How bundling works': 'how-much-can-i-save', 'page:/Data/Bundle confidence': 'why-choose-liberty'}.get(ds)
        if anchor:
            row = re.sub(r'&amp;RenderingIdentifier=[^&\"]*', '', row)
            row = row.replace('" />', '&amp;RenderingIdentifier=' + anchor + '" />')
        if ds == 'page:/Data/How bundling works':
            row = re.sub(r'FieldNames=\{[^}]+\}', 'FieldNames=' + h.brace(model['variantIds']['PublicSplitContent.ImageLeft']), row)
        if ds == 'page:/Data/Why bundle':
            row = re.sub(r'FieldNames=\{[^}]+\}', 'FieldNames=' + h.brace(model['variantIds']['PublicSplitContent.Benefits']), row)
        placements.append(row)
        if ds == 'page:/Data/Bundle choices': placements.append(placement('PublicArticle', 'Multi-car savings', 'Centered'))
        if ds == 'page:/Data/Bundle confidence': placements.append(placement('PublicSplitContent', 'Mobile app', 'AppFeatures'))
        if ds == 'page:/Data/Ready for a quote':
            placements += [placement('PublicSection', 'Related insurance guides', 'RelatedArticles'), placement('PublicArticle', 'More coverage information', 'Centered', 'bundling-more-coverage')]
    rendering_field['Value'] = layout[:layout.index(rows[0])] + ''.join(placements) + layout[layout.rindex(rows[-1]) + len(rows[-1]):]
    change(DATA + '/Hero', {'secondaryLink': ''})
    retired = SITE + '/Home/insurance-resources/bundle-car-and-home'
    retired_records = [r for p, r in records.items() if p == retired or p.startswith(retired + '/')]
    records = {p: r for p, r in records.items() if not (p == retired or p.startswith(retired + '/'))}
    # Source-relative editorial links point to genuine pages on the public
    # reference site; only the in-page jump links remain local.
    for path, record in records.items():
        if not path.startswith(DATA + '/'): continue
        for field in record['Languages'][0]['Versions'][0]['Fields']:
            if field['Hint'] in ['body', 'heading', 'introduction', 'answer']:
                field['Value'] = re.sub(r'href="/(?!/)', 'href="https://www.libertymutual.com/', field['Value'])
    for path, record in records.items():
        if path not in original:
            continue
        before, after = fields(original[path]), fields(record)
        changed = {key: value for key, value in after.items() if before.get(key) != value}
        if changed: changes.append({'id': record['ID'], 'path': path, 'fields': changed, 'mode': 'new Draft from latest approved; preserve other fields and history'})
    return {
        'schemaVersion': 1, 'sourceUrl': 'https://www.libertymutual.com/bundling', 'status': 'Prepared offline only; no CMS writes',
        'pageId': h.uid(PAGE), 'workflow': model['workflow'], 'faqCollectionId': h.uid(DATA + '/FAQs'), 'firstFaqId': ordered_questions[0], 'orderedFaqIds': ordered_questions,
        'newDefinitions': definitions, 'createOnlyEditorialRecords': [r for p, r in records.items() if p not in original], 'newDraftChanges': changes,
        'mediaAssignments': media, 'assets': [{'key': k, 'filename': f, 'alt': a, 'sourceUrl': u} for k, f, a, u in ASSETS],
        'layoutRule': 'Apply only this page composition in a new Final Renderings version, preserve other page fields and Shared Renderings.',
        'retiredResource': {'id': h.uid(retired), 'path': retired, 'removedSeedIds': [r['ID'] for r in retired_records], 'liveAction': 'Root owns reference checks, unpublish, and recoverable deletion.'},
        '_editorial': {**seed, 'records': list(records.values()), 'routeCount': seed.get('routeCount', 17) - (1 if retired_records else 0), 'resourcePageCount': seed.get('resourcePageCount', 10) - (1 if retired_records else 0)},
        '_extensions': {**extensions, 'newDefinitions': [r for r in extensions['newDefinitions'] if r['ID'] not in {d['ID'] for d in definitions}] + definitions},
    }

def main():
    parser = argparse.ArgumentParser(); parser.add_argument('--reference-html', required=True, type=Path); parser.add_argument('--output', required=True, type=Path); parser.add_argument('--media-bindings', type=Path); parser.add_argument('--write-baseline', action='store_true'); args = parser.parse_args()
    assert args.output.is_absolute() and not args.output.is_relative_to(ROOT), 'Keep the application proposal outside the source checkout.'
    plan = prepare(args.reference_html.read_text(), json.loads(args.media_bindings.read_text()) if args.media_bindings else {})
    editorial, extensions = plan.pop('_editorial'), plan.pop('_extensions')
    args.output.write_text(json.dumps(plan, ensure_ascii=False, indent=2) + '\n')
    if args.write_baseline:
        (BASE / 'public-editorial-records.json').write_text(json.dumps(editorial, ensure_ascii=False, indent=2) + '\n')
        (BASE / 'public-model-extensions.json').write_text(json.dumps(extensions, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'newDefinitions': len(plan['newDefinitions']), 'newEditorialItems': len(plan['createOnlyEditorialRecords']), 'draftChanges': len(plan['newDraftChanges']), 'media': len(plan['assets']), 'faqs': len(plan['orderedFaqIds']), 'output': str(args.output)}))
if __name__ == '__main__': main()
