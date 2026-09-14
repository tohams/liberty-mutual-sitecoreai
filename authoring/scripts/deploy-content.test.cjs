const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '../..');
const MODULES = 'authoring/items/liberty-mutual';

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'portal-deploy-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const files = ['authoring/scripts/deploy-content.sh', 'xmcloud.build.json',
    ...['Content', 'Taxonomy'].map(name => `${MODULES}/LibertyMutual.${name}.module.json`)];
  for (const file of files) {
    const target = path.join(directory, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(ROOT, file), target);
  }
  const binaries = path.join(directory, 'bin');
  fs.mkdirSync(binaries);
  fs.writeFileSync(path.join(binaries, 'dotnet'), '#!/bin/sh\nprintf \'%s\\n\' "$*" >> "$PORTAL_DEPLOY_TEST_LOG"\n', { mode: 0o700 });
  const log = path.join(directory, 'native-commands.log');
  return {
    edit(file, update) {
      const target = path.join(directory, file);
      const value = JSON.parse(fs.readFileSync(target, 'utf8'));
      update(value);
      fs.writeFileSync(target, JSON.stringify(value));
    },
    run(...flags) {
      const result = spawnSync('bash', [path.join(directory, 'authoring/scripts/deploy-content.sh'), 'demo', ...flags], {
        cwd: directory,
        encoding: 'utf8',
        env: { ...process.env, PATH: binaries + path.delimiter + process.env.PATH, PORTAL_DEPLOY_TEST_LOG: log },
      });
      const commands = fs.existsSync(log) ? fs.readFileSync(log, 'utf8').trim().split('\n') : [];
      return { ...result, commands, pushes: commands.filter(command => command.startsWith('sitecore ser push ')) };
    },
  };
}

function pushedModules(result) {
  return result.pushes.map(command => command.match(/-i ([^ ]+)/)[1]);
}

test('normal release never seeds or recreates editorial content or taxonomy options', t => {
  const result = fixture(t).run();
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(pushedModules(result), ['LibertyMutual.Model', 'LibertyMutual.SitePresentation']);
  assert.equal(result.commands.some(command => command.startsWith('sitecore publish ')), false);
  assert.match(result.commands[0], /ser validate .*LibertyMutual\.Taxonomy/);
});

test('taxonomy seeding is explicit and follows its model definitions', t => {
  const result = fixture(t).run('--seed-taxonomy');
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(pushedModules(result), ['LibertyMutual.Model', 'LibertyMutual.Taxonomy', 'LibertyMutual.SitePresentation']);
});

test('fresh-site seeding creates the Data parent before managed metadata lists', t => {
  const result = fixture(t).run('--seed');
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(pushedModules(result), ['LibertyMutual.Model', 'LibertyMutual.Content', 'LibertyMutual.Taxonomy', 'LibertyMutual.SitePresentation']);
});

test('combined seed flags do not push the taxonomy twice', t => {
  const result = fixture(t).run('--seed-taxonomy', '--seed');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(pushedModules(result).filter(name => name === 'LibertyMutual.Taxonomy').length, 1);
});

test('what-if protects every requested push and suppresses publication', t => {
  const result = fixture(t).run('--seed', '--publish', '--what-if');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.pushes.length, 4);
  assert.ok(result.pushes.every(command => command.endsWith(' --what-if')));
  assert.equal(result.commands.some(command => command.startsWith('sitecore publish ')), false);
});

for (const [name, mutate] of [
  ['updates', module => { module.items.includes[0].allowedPushOperations = 'CreateAndUpdate'; }],
  ['a wider root', module => { module.items.includes[0].path = '/sitecore/content'; }],
  ['additional includes', module => { module.items.includes.push({ ...module.items.includes[0], name: 'other' }); }],
  ['include rules', module => { module.items.includes[0].rules = [{ path: '/Products', scope: 'SingleItem' }]; }],
]) {
  test(`rejects taxonomy ${name} before the first native operation`, t => {
    const context = fixture(t);
    context.edit(`${MODULES}/LibertyMutual.Taxonomy.module.json`, mutate);
    const result = context.run('--seed-taxonomy');
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Refusing taxonomy seed/);
    assert.deepEqual(result.commands, []);
  });
}

test('rejects overlapping content ownership before the first native operation', t => {
  const context = fixture(t);
  context.edit(`${MODULES}/LibertyMutual.Content.module.json`, module => {
    module.items.includes[0].rules = module.items.includes[0].rules.filter(rule => !rule.path.endsWith('/Data/Taxonomy'));
  });
  const result = context.run('--seed');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Refusing seed push/);
  assert.deepEqual(result.commands, []);
});

for (const module of ['LibertyMutual.Content', 'LibertyMutual.Taxonomy', '*']) {
  test(`rejects ${module} in authoring resource packages before the first native operation`, t => {
    const context = fixture(t);
    context.edit('xmcloud.build.json', build => { build.deployItems.modules.push(module); });
    const result = context.run();
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /outside authoring resource packages/);
    assert.deepEqual(result.commands, []);
  });
}

test('rejects an unknown command-line flag without contacting Sitecore', t => {
  const result = fixture(t).run('--all');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Unknown option/);
  assert.deepEqual(result.commands, []);
});
