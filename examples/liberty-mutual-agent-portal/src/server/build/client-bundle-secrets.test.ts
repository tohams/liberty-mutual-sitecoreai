import assert from 'node:assert/strict';
import test from 'node:test';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const script = join(process.cwd(), 'scripts/check-client-bundle-secrets.mjs');
const privateContext = 'synthetic-private-context-7cf67f8e';
const editingSecret = 'synthetic-editing-secret-with-"quote"-and-\\slash';
const publicContext = 'synthetic-public-browser-context';

async function runCheck(directory: string, env: Record<string, string> = {}) {
  return new Promise<{ code: number; output: string }>((resolve, reject) => {
    execFile(process.execPath, [script], {
      cwd: directory, env: { NODE_ENV: 'production', ...env }, timeout: 15000,
    }, (error, stdout, stderr) => {
      if (error && typeof error.code !== 'number') { reject(error); return; }
      resolve({ code: typeof error?.code === 'number' ? error.code : 0, output: stdout + stderr });
    });
  });
}

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), 'portal-client-asset-test-'));
  await mkdir(join(directory, '.next/static/chunks'), { recursive: true });
  return directory;
}

test('postbuild allows the scoped public context and scans client assets without inspecting server bundles', async () => {
  const directory = await fixture();
  try {
    // Exercise the same production-local environment loading as npm postbuild.
    await writeFile(join(directory, '.env.production.local'), `SITECORE_EDGE_CONTEXT_ID=${privateContext}\n`);
    await writeFile(join(directory, '.next/static/chunks/page.js'), `window.context=${JSON.stringify(publicContext)};`);
    await writeFile(join(directory, '.next/static/chunks/page.js.map'), '{}');
    await mkdir(join(directory, '.next/server'), { recursive: true });
    await writeFile(join(directory, '.next/server/page.js'), privateContext);
    const result = await runCheck(directory);
    assert.equal(result.code, 0);
    assert.match(result.output, /Passed: 2 emitted browser assets/);
    assert.ok(!result.output.includes(privateContext));
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('postbuild rejects private context and encoded editing secret exposure without logging content or filenames', async () => {
  const directory = await fixture();
  try {
    for (const exposure of [privateContext, JSON.stringify(editingSecret), encodeURIComponent(editingSecret)]) {
      await writeFile(join(directory, '.next/static/chunks/confidential-fixture.js.map'), exposure);
      const result = await runCheck(directory, {
        SITECORE_EDGE_CONTEXT_ID: privateContext, SITECORE_EDITING_SECRET: editingSecret,
        NEXT_PUBLIC_SITECORE_EDGE_CONTEXT_ID: publicContext,
      });
      assert.equal(result.code, 1);
      assert.match(result.output, /Private configuration was found/);
      for (const withheld of [privateContext, editingSecret, exposure, 'confidential-fixture', directory]) {
        assert.ok(!result.output.includes(withheld), 'Failure output must contain only the fixed diagnostic');
      }
    }
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('postbuild fails closed when its configuration or emitted browser assets are absent', async () => {
  const directory = await fixture();
  try {
    assert.equal((await runCheck(directory)).code, 1);
    const configured = { SITECORE_EDGE_CONTEXT_ID: privateContext };
    assert.equal((await runCheck(directory, configured)).code, 1, 'An empty asset tree is not a passing scan');
    await rm(join(directory, '.next'), { recursive: true });
    const missing = await runCheck(directory, configured);
    assert.equal(missing.code, 1);
    assert.ok(!missing.output.includes(directory));
    assert.ok(!missing.output.includes(privateContext));
  } finally { await rm(directory, { recursive: true, force: true }); }
});
