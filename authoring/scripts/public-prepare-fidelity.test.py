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
