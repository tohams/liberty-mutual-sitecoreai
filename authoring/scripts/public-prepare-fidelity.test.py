#!/usr/bin/env python3
"""Offline reference/alternative-text regression contracts; no tenant access."""
from pathlib import Path
import importlib.util
import json
import copy
import sys
import unittest
sys.dont_write_bytecode=True

def load(name, filename):
    spec=importlib.util.spec_from_file_location(name,Path(__file__).with_name(filename))
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module

fidelity=load('fidelity_reference_contract','public-prepare-fidelity.py')
assets=load('fidelity_alt_contract','public-prepare-asset-inventory.py')
editorial=load('search_native_contract','public-prepare-editorial-seed.py')

class NativeReferences(unittest.TestCase):
    def test_faq_owner_declares_related_and_recursive_dependencies_only(self):
        definitions,_=fidelity.phase.records()
        faq=next(record for record in definitions if record['Path']==fidelity.h.RP+'/PublicFaq')
        dependency=next(field for field in faq['SharedFields'] if field['Hint']=='Content Dependencies')
        self.assertEqual(dependency['ID'],'b4bbc0be-7619-4678-b2f7-947d84aa77a9')
        self.assertEqual(dependency['Value'].split('|'),[
            '{07BB8ABE-7A1D-4AF2-B7D6-BF5140AAAF21}',
            '{5E13EE6F-522F-41CA-8929-AEE8EE103862}',
        ])

    def test_quote_summary_and_metadata_describe_the_zip_control(self):
        before='Review your product and state choices before continuing to Liberty Mutual for a quote.'
        after='Review your product and ZIP Code choices before continuing to Liberty Mutual for a quote.'
        self.assertEqual(editorial.quote_hero_summary(before),after)
        self.assertEqual(editorial.quote_hero_summary('<p>'+before+'</p>'),'<p>'+after+'</p>')
        self.assertEqual(editorial.quote_hero_summary(after),after)
        self.assertEqual(editorial.quote_hero_summary('Review state insurance requirements.'),'Review state insurance requirements.')

    def test_factory_search_uses_the_approved_answers_source(self):
        source={'searchIndex':editorial.PREVIOUS_SEARCH_INDEX_ID,'fieldsMapping':{'link':'canonicalUrl'}}
        original=copy.deepcopy(source)
        actual=editorial.native_search_configuration(source)
        self.assertEqual(source,original)
        self.assertEqual(actual['searchIndex'],editorial.SEARCH_INDEX_ID)
        self.assertEqual(editorial.SEARCH_INDEX_NAME,'Liberty Mutual Approved Answers')
        self.assertEqual(editorial.native_search_configuration(actual),actual)

    def test_resource_preparation_has_one_page_identity_and_no_reusable_answer_library(self):
        pages=[];answers=[]
        for n in range(10):
            slug='resource-'+str(n)
            answers.append({'slug':slug,'question':'Question '+str(n),'canonicalUrl':'https://liberty-mutual-public-site.vercel.app/insurance-resources/'+slug,'answer':'Approved page content','formalWording':'<p>Policy details</p>','explanation':'<p>Explanation</p>','owner':'Content team','state':'All','product':'auto-home','audience':'consumer','sourceLink':{'text':'Reference source','href':'https://www.libertymutual.com/bundling'},'nextStep':{'text':'Find an agent','href':'/contact-an-agent'}})
            pages.append({'slug':'/insurance-resources/'+slug,'approvedAnswerSlug':slug})
        pages.extend({'slug':slug} for slug in ['/','/search','/insurance-resources','/bundling','/get-a-quote','/contact-an-agent','/vehicle/auto-insurance'])
        for page in pages:
            page.update(title='Page title',canonicalUrl='https://liberty-mutual-public-site.vercel.app'+page['slug'],hero={'heading':'Page title','summary':'<p>Page summary</p>'},introduction={'heading':'Introduction','body':'<p>Body</p>'})
            if page['slug']=='/search':page['searchConfiguration']={'searchIndex':editorial.SEARCH_INDEX_ID,'fieldsMapping':{'title':'title','link':'canonicalurl'}}
        source={'pages':pages,'answers':answers,'productOptions':[],'sharedPromotionDraft':{}}
        original=copy.deepcopy(source);editorial.RECORDS.clear();editorial.MEDIA.clear()
        result=editorial.prepare(source,{})
        self.assertEqual(source,original)
        self.assertEqual(len(result['resourcePageIds']),10)
        self.assertTrue(all('/Data/Approved answers' not in row['Path'] for row in result['records']))
        resources=[r for r in result['records'] if r['Template']=='b99218ea-e1fd-41af-a4ae-7ec9e5c30b17']
        self.assertEqual(len(resources),10)
        for row in resources:
            fields={f['Hint']:f for f in row['Languages'][0]['Versions'][0]['Fields']}
            self.assertEqual(fields['question']['ID'],'de4a7a26-6fe3-571d-9b4c-6e117690f9b5')
            self.assertEqual(fields['sourceLink']['ID'],editorial.M['fieldIds']['PublicPage.sourceLink'])
            self.assertEqual(fields['includeInSearch']['Value'],'1')
            self.assertEqual(len(fields['product']['Value'].split('|')),2)
            self.assertEqual(fields['product']['Value'],editorial.h.checklist_value('product','auto,home'))
            layout=next(f['Value'] for f in row['SharedFields'] if f['Hint']=='__Renderings')
            self.assertIn('ds="'+editorial.BRACE(row['ID'])+'"',layout)
            # Native placement IDs are preserved even though the rendering's
            # technical name changes. Personalization attaches to that identity.
            expected=editorial.UID(row['Path']+'/rendering/PublicApprovedAnswer/6')
            self.assertIn('uid="'+editorial.BRACE(expected)+'"',layout)
        editorial.RECORDS.clear();editorial.MEDIA.clear()

    def test_factory_checklists_require_known_native_choices_and_preserve_atomic_selection(self):
        h=editorial.h
        self.assertEqual(h.checklist_value('product','auto-home'),h.checklist_value('product','auto,home'))
        self.assertEqual(h.checklist_value('product',h.checklist_value('product','auto,home')),h.checklist_value('product','auto,home'))
        for name,value in [('state','All,TX'),('product','missing'),('audience','consumer,customer')]:
            with self.subTest(name=name,value=value),self.assertRaises(AssertionError):h.checklist_value(name,value)
        self.assertEqual(h.checklist_value('product',''),'')

    def test_selector_copy_describes_the_actual_zip_input(self):
        before='<p>Choose auto insurance, one property option, or both. Your state helps keep your next step relevant.</p>'
        after='<p>Choose auto insurance, one property option, or both. Your ZIP Code helps keep your next step relevant.</p>'
        self.assertEqual(editorial.selector_introduction(before),after)
        self.assertEqual(editorial.selector_introduction(after),after)
        self.assertEqual(editorial.selector_introduction('<p>Review your state requirements.</p>'),'<p>Review your state requirements.</p>')

    def test_search_normalization_preserves_input_and_ui_labels(self):
        source={'searchIndex':'native-source','fieldsMapping':{'title':'title','link':'canonicalUrl','source':'sourceUrl','effectiveDate':'effectiveDate'},'options':{'pageSize':10}}
        original=copy.deepcopy(source)
        actual=editorial.native_search_configuration(source)
        self.assertEqual(source,original)
        self.assertEqual(actual['fieldsMapping'],{'title':'title','link':'canonicalurl','source':'sourceurl','effectiveDate':'effectivedate'})
        actual['options']['pageSize']=20
        self.assertEqual(source['options']['pageSize'],10)

    def test_unknown_search_technical_fields_and_fields_id_are_rejected(self):
        for name in ['privateProfileId','id','unknown',None,7]:
            with self.subTest(name=name),self.assertRaises(AssertionError):
                editorial.native_search_configuration({'searchIndex':'source','fieldsMapping':{'link':name}})

    def test_selector_object_resolves_all_eight_real_native_options(self):
        fidelity.phase.records()
        fields=fidelity.Preparation({}).fields('PublicProductSelector',{'products':{'productKeys':list(fidelity.PRODUCT_KEYS)}},fidelity.h.SITE+'/Home/Data/Quote choices')
        selected=fields['products'].split('|')
        records=json.loads((fidelity.h.BASE/'public-editorial-records.json').read_text())['records']
        actual={record['ID'].lower():record for record in records}
        self.assertEqual(len(selected),8)
        self.assertEqual(len(set(selected)),8)
        for reference,key in zip(selected,fidelity.PRODUCT_KEYS):
            self.assertEqual(actual[reference.strip('{}').lower()]['Path'],fidelity.h.SITE+'/Data/Product options/'+key)

    def test_malformed_or_unknown_reference_contract_fails(self):
        for value in ['auto',{},[],{'products':['auto']},{'productKeys':['missing']},['auto','auto']]:
            with self.subTest(value=value),self.assertRaises(AssertionError):fidelity.product_keys(value)

    def test_icons_and_logos_have_visitor_facing_alternative_text(self):
        for key in fidelity.PRODUCT_KEYS:
            alt=assets.consumer_alt('product-'+key,{'description':'Internal implementation provenance'})
            self.assertIn('insurance',alt.lower())
            self.assertNotIn('implementation',alt.lower())
        for key in ['logo-header','logo-footer-vertical','logo-footer-medallion']:
            self.assertEqual(assets.consumer_alt(key,{}),'Liberty Mutual Insurance')

    def test_description_cannot_silently_become_alt_text(self):
        with self.assertRaises(AssertionError):assets.consumer_alt('new-photo',{'description':'Implementation provenance'})
        with self.assertRaises(AssertionError):assets.consumer_alt('new-photo',{'alt':'Actual rendered source SVG'})
        self.assertEqual(assets.consumer_alt('new-photo',{'alt':'Family playing basketball'}),'Family playing basketball')

if __name__=='__main__':unittest.main()
