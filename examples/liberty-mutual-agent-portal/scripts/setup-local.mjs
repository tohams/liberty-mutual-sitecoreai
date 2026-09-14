#!/usr/bin/env node
import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const redisKeys = ['PORTAL_REDIS_REST_URL', 'PORTAL_REDIS_REST_TOKEN', 'KV_REST_API_URL', 'KV_REST_API_TOKEN'];

export async function setupLocal(directory, environment = process.env) {
  const inheritedRedis = redisKeys.filter(key => environment[key]?.trim());
  if (inheritedRedis.length) {
    throw new Error(`Remove inherited Redis settings before this local workshop: ${inheritedRedis.join(', ')}. Redis takes precedence over local JSON.`);
  }
  if (environment.VERCEL || environment.NODE_ENV === 'production') {
    throw new Error('Run setup:local on a developer workstation in development mode. It does not configure a deployed environment.');
  }
  const manifest = JSON.parse(await readFile(resolve(directory, 'package.json'), 'utf8'));
  if (manifest.name !== 'liberty-mutual-agent-portal') {
    throw new Error('Run this command from examples/liberty-mutual-agent-portal.');
  }
  const secret = () => randomBytes(32).toString('hex');
  const contents = `# Local connected frontend workshop. Keep this file out of Git.
# Obtain these two different scoped values from the platform owner.
# Server: approved Live content context. Browser: public-scoped child context.
SITECORE_EDGE_CONTEXT_ID=
NEXT_PUBLIC_SITECORE_EDGE_CONTEXT_ID=
NEXT_PUBLIC_SITECORE_EDGE_PLATFORM_HOSTNAME=https://edge-platform.sitecorecloud.io
NEXT_PUBLIC_DEFAULT_SITE_NAME=liberty-mutual-agent-portal
NEXT_PUBLIC_DEFAULT_LANGUAGE=en
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Generated for this machine only. Never copy production secrets or Redis settings here.
SITECORE_EDITING_SECRET=${secret()}
PORTAL_SESSION_SECRET=${secret()}
PORTAL_OPERATOR_SECRET=${secret()}
PORTAL_ENVIRONMENT=liberty-mutual-local-${randomBytes(6).toString('hex')}
PORTAL_STATE_ADAPTER=local-json
PORTAL_LOCAL_STATE_DIRECTORY=.portal-state
PORTAL_CONTENT_ADAPTER=sitecore

# This workshop reads native content/Search and does not train shared CDP profiles.
NEXT_PUBLIC_PORTAL_TRACKING_ENABLED=false
PORTAL_VERIFIED_PROFILE_GENERATIONS=
PORTAL_PERSONALIZATION_DIAGNOSTICS=false
`;
  try {
    await writeFile(resolve(directory, '.env.local'), contents, { flag: 'wx', mode: 0o600 });
    return true;
  } catch (error) {
    if (error?.code === 'EEXIST') return false;
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const created = await setupLocal(process.cwd());
    console.log(created
      ? 'Created .env.local with isolated local state and new local secrets. Add the two approved Sitecore context values, run npm ci, then npm run dev.'
      : '.env.local already exists and was left unchanged. Verify its local state settings and approved context values before running npm run dev.');
    console.log('Keep Redis settings absent from every local .env file and your terminal environment. Restart the dev server after changing environment values.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
