import assert from 'node:assert/strict';
import test from 'node:test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';

test('login route separates verified editing sessions from ordinary portal sessions', async () => {
  const environment = { ...process.env };
  delete environment.NODE_OPTIONS;
  delete environment.NODE_TEST_CONTEXT;
  const { stdout } = await promisify(execFile)(process.execPath, [
    '--conditions=react-server', '--import', 'tsx', '--experimental-test-module-mocks', '--test', '--test-reporter=tap',
    join(process.cwd(), 'src/server/auth/login-page.fixture.ts'),
  ], { env: environment, timeout: 15000 });
  assert.match(stdout, /pass 2/);
});
