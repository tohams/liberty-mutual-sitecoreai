"""Exercise additive generation and preservation in a disposable repository."""
from pathlib import Path
import importlib.util
import shutil
import sys
import tempfile
import unittest
from unittest.mock import patch

import yaml

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('product_catalog_seed', Path(__file__).with_name('build-product-catalog-seed.py'))
seed = importlib.util.module_from_spec(spec)
spec.loader.exec_module(seed)


class ProductCatalogSeedTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        root = Path(self.temp.name)
        base = root / 'authoring/items/liberty-mutual'
        base.mkdir(parents=True)
        for name in ['content-manifest.json', 'LibertyMutual.Content.module.json', 'LibertyMutual.SitePresentation.module.json']:
            shutil.copyfile(seed.BASE / name, base / name)
        fixture = root / 'examples/liberty-mutual-agent-portal/fixtures/products.json'
        fixture.parent.mkdir(parents=True)
        shutil.copyfile(seed.ROOT / fixture.relative_to(root), fixture)
        for key, value in [('ROOT', root), ('BASE', base)]:
            replacement = patch.object(seed, key, value)
            replacement.start()
            self.addCleanup(replacement.stop)

    def generate(self):
        records, _, writes = seed.prepare()
        for path, value in writes.items():
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(value)
        return records

    def test_preserves_authored_branch_reference_and_channel_on_repeat(self):
        records = self.generate()
        for path, hint, new_value in [
            (seed.PROTOTYPE, 'catalogBody', '<p>Reviewed author content.</p>'),
            (seed.PRODUCTS + '/auto', '__Display name', 'An authored product label'),
            (seed.CHANNELS + '/all', '__Sortorder', '25'),
        ]:
            destination = seed.file_for(next(record for record in records if record['Path'] == path))
            current = yaml.safe_load(destination.read_text())
            fields = list(current.get('SharedFields', []))
            for language in current['Languages']:
                fields += language.get('Fields', []) + [field for version in language.get('Versions', []) for field in version.get('Fields', [])]
            for field in fields:
                if field['Hint'] == hint:
                    field['Value'] = new_value
            destination.write_text(seed.serialize(current))
        before = {path: path.read_bytes() for path in seed.ROOT.rglob('*') if path.is_file()}
        _, _, writes = seed.prepare()
        self.assertEqual(writes, {})
        self.assertEqual(before, {path: path.read_bytes() for path in seed.ROOT.rglob('*') if path.is_file()})

    def test_rejects_conflicting_model_before_recreating_missing_items(self):
        records = self.generate()
        field_record = next(record for record in records if record['Path'] == seed.PAGE + '/Content/catalogProducts')
        destination = seed.file_for(field_record)
        current = yaml.safe_load(destination.read_text())
        source = next(field for field in current['SharedFields'] if field['Hint'] == 'Source')
        source['Value'] = '/sitecore/content/AnotherSite/Products'
        destination.write_text(seed.serialize(current))
        missing = seed.file_for(next(record for record in records if record['Path'] == seed.DATA))
        missing.unlink()
        with self.assertRaisesRegex(ValueError, 'Existing model differs'):
            seed.prepare()
        self.assertFalse(missing.exists())

    def test_rejects_reference_identity_conflict_without_overwriting(self):
        records = self.generate()
        destination = seed.file_for(next(record for record in records if record['Path'] == seed.PRODUCTS + '/auto'))
        current = yaml.safe_load(destination.read_text())
        current['Template'] = '1930bbeb-7805-471a-a3be-4858ac7cf696'
        destination.write_text(seed.serialize(current))
        before = destination.read_bytes()
        with self.assertRaisesRegex(ValueError, 'Existing item identity differs'):
            seed.prepare()
        self.assertEqual(destination.read_bytes(), before)

    def test_droplist_source_resolves_choices_without_changing_stored_values(self):
        records = self.generate()
        by_path = {record['Path']: record for record in records}
        channel_field = by_path[seed.PAGE + '/Content/catalogChannel']
        source = next(field['Value'] for field in channel_field['SharedFields'] if field['Hint'] == 'Source')
        self.assertEqual(source, seed.CHANNELS)
        folder = by_path[source]
        choices = [record for record in records if record['Parent'] == folder['ID']]
        self.assertEqual([record['Path'].removeprefix(source + '/') for record in choices], ['all', 'independent', 'wholesale'])
        for path in [seed.PROTOTYPE, seed.PAGE + '/__Standard Values']:
            fields = by_path[path]['Languages'][0]['Versions'][0]['Fields']
            self.assertEqual(next(field['Value'] for field in fields if field['Hint'] == 'catalogChannel'), 'all')


if __name__ == '__main__':
    unittest.main()
