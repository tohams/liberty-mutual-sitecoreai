import assert from 'node:assert/strict';
import test, { mock } from 'node:test';
import { join } from 'node:path';
import { PortalError } from '../errors';

let draftEnabled = false;
let session: object | null = { agentId: 'fixture-agent' };
let sessionReads = 0;
let workspaceReads = 0;
let workspaceError: Error | undefined;
const redirectSignal = new Error('Redirect to active workspace');
const LoginScreen = () => null;

mock.module('next/headers', { namedExports: { draftMode: async () => ({ isEnabled: draftEnabled }) } });
mock.module('next/navigation', { namedExports: {
  redirect: (path: string) => { assert.equal(path, '/workspace'); throw redirectSignal; },
} });
mock.module(join(process.cwd(), 'src/server/auth/session.ts'), { namedExports: {
  getSession: async () => { sessionReads++; return session; },
} });
mock.module(join(process.cwd(), 'src/server/data/portal.ts'), { namedExports: {
  getPortalBootstrap: async () => { workspaceReads++; if (workspaceError) throw workspaceError; return {}; },
} });
mock.module(join(process.cwd(), 'src/features/auth/LoginScreen.tsx'), { namedExports: { LoginScreen } });

test('explicit login remains available to a verified draft session without reading agent workspace data', async () => {
  const { default: LoginPage } = await import('../../app/login/page');
  draftEnabled = true;
  const result = await LoginPage();
  assert.equal(result.type, LoginScreen);
  assert.equal(sessionReads, 0);
  assert.equal(workspaceReads, 0);
});

test('ordinary active sessions still redirect and inactive sessions can sign in', async () => {
  const { default: LoginPage } = await import('../../app/login/page');
  draftEnabled = false;
  await assert.rejects(LoginPage(), (error) => error === redirectSignal);
  assert.equal(sessionReads, 1);
  assert.equal(workspaceReads, 1);
  for (const status of [401, 409]) {
    workspaceError = new PortalError('STALE_WORKSPACE', 'This workspace needs a fresh session.', status);
    assert.equal((await LoginPage()).type, LoginScreen);
  }
  workspaceError = undefined;
  session = null;
  const previousWorkspaceReads = workspaceReads;
  assert.equal((await LoginPage()).type, LoginScreen);
  assert.equal(workspaceReads, previousWorkspaceReads);
});
