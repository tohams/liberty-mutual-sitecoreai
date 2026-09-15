import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { POST } from '../../app/api/auth/login/route';
import { SESSION_COOKIE, verifySession } from './session';

test('a rejected portal login preserves an existing editor draft session', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'portal-login-draft-test-'));
  const environment = {
    NODE_ENV: 'test', PORTAL_ENVIRONMENT: 'login-draft-tests', PORTAL_STATE_ADAPTER: 'local-json',
    PORTAL_LOCAL_STATE_DIRECTORY: directory, VERCEL: '', PORTAL_REDIS_REST_URL: '', KV_REST_API_URL: '',
  };
  const previous = Object.fromEntries(Object.keys(environment).map((key) => [key, process.env[key]]));
  Object.assign(process.env, environment);
  try {
    const response = await POST(new Request('https://portal.example/api/auth/login', {
      method: 'POST',
      headers: {
        Origin: 'https://portal.example', 'Content-Type': 'application/json',
        Cookie: '__prerender_bypass=existing-editor-session; __next_preview_data=existing-preview',
      },
      body: JSON.stringify({ username: 'unknown.fixture-user', password: 'deliberately-invalid' }),
    }));
    assert.equal(response.status, 401);
    assert.equal((await response.json()).error.code, 'INVALID_CREDENTIALS');
    assert.deepEqual(response.headers.getSetCookie(), [], 'Authentication failure must not alter any session cookies');
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await rm(directory, { recursive: true, force: true });
  }
});


test('successful portal login establishes the agent session and lands on canonical Home', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'portal-login-home-test-'));
  const environment = {
    NODE_ENV: 'test', PORTAL_ENVIRONMENT: 'login-home-tests', PORTAL_STATE_ADAPTER: 'local-json',
    PORTAL_LOCAL_STATE_DIRECTORY: directory, VERCEL: '', PORTAL_REDIS_REST_URL: '', KV_REST_API_URL: '',
    PORTAL_SESSION_SECRET: 'test-only-home-login-secret-with-more-than-32-characters',
  };
  const previous = Object.fromEntries(Object.keys(environment).map((key) => [key, process.env[key]]));
  Object.assign(process.env, environment);
  try {
    const response = await POST(new Request('https://portal.example/api/auth/login', {
      method: 'POST',
      headers: { Origin: 'https://portal.example', 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'daniel.01', password: 'Sitecore' }),
    }));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { success: true, redirectTo: '/' });
    const session = await verifySession(response.cookies.get(SESSION_COOKIE)?.value);
    assert.equal(session?.username, 'daniel.01');
    assert.equal(session?.reviewerPack, '01');
    assert.equal(response.headers.get('Location'), null, 'The API returns the canonical destination to the login client');
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await rm(directory, { recursive: true, force: true });
  }
});
