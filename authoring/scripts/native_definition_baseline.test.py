#!/usr/bin/env python3
"""Check bounded legacy definition preservation without CMS credentials."""
import copy,json,unittest,importlib.util
from pathlib import Path
import yaml
from native_definition_baseline import BASE,reconcile_definition,same_definition_semantics
class NativeDefinitionPreservation(unittest.TestCase):
    def setUp(self):self.rows=json.loads(BASE.read_text())['records']
    def test_exact_seventeen_definitions_preserve_native_versions_and_current_values(self):
        self.assertEqual(len(self.rows),17)
        for path,row in self.rows.items():
            self.assertNotIn('/Home',path);self.assertNotIn('/Data/',path)
            self.assertEqual(reconcile_definition(row['previous']),row['native'])
        product=next(row for path,row in self.rows.items() if path.endswith('/ProductPage/__Standard Values'))
        self.assertFalse(any(f['Hint']=='catalogChannel' for v in product['native']['Languages'][0]['Versions'] for f in v['Fields']))
        for path,row in self.rows.items():
            if '/Available Renderings/' in path:self.assertEqual(row['native']['Languages'][0]['Versions'][0]['Version'],1)
    def test_unexpected_generated_change_fails_instead_of_overwriting_native_values(self):
        old=copy.deepcopy(next(row['previous'] for path,row in self.rows.items() if path.endswith('/ProductPage/__Standard Values')))
        next(f for f in old['Languages'][0]['Versions'][0]['Fields'] if f['Hint']=='catalogChannel')['Value']='unreviewed'
        with self.assertRaisesRegex(ValueError,'review baseline'):reconcile_definition(old)
    def test_empty_native_fields_have_canonical_whitespace_free_serialization(self):
        spec=importlib.util.spec_from_file_location('native_empty_field_serializer',Path(__file__).with_name('build-product-spotlight-seed.py'))
        serializer=importlib.util.module_from_spec(spec);spec.loader.exec_module(serializer)
        for value in [None,'']:
            encoded=serializer.serialize({'ID':'example','Fields':[{'Hint':'Datasource Location','Value':value}]})
            self.assertIn('  Value:\n',encoded)
            self.assertFalse(any(line!=line.rstrip() for line in encoded.splitlines()))
            self.assertIsNone(yaml.safe_load(encoded)['Fields'][0]['Value'])

    def test_semantic_comparison_keeps_meaningful_copy_and_selection_order(self):
        source=copy.deepcopy(next(iter(self.rows.values()))['native']);same=copy.deepcopy(source)
        self.assertTrue(same_definition_semantics(source,same))
        same['Path']+='/unreviewed';self.assertFalse(same_definition_semantics(source,same))
if __name__=='__main__':unittest.main()
