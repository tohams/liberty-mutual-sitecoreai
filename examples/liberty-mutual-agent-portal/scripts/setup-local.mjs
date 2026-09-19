#!/usr/bin/env node
import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseEnv } from 'node:util';

const redisKeys = ['PORTAL_REDIS_REST_URL', 'PORTAL_REDIS_REST_TOKEN', 'KV_REST_API_URL', 'KV_REST_API_TOKEN'];

// Owner-approved defaults for this PRIVATE POC repository. Setup tooling only:
// never import this module into application code or a browser bundle.
const pocSettings = {
  SITECORE_EDGE_CONTEXT_ID: '66F013htW9aRcYNXn5EyMA',
  NEXT_PUBLIC_SITECORE_EDGE_CONTEXT_ID: '6SCkrPfaQoiQEiAK6wMIEe',
  NEXT_PUBLIC_DEFAULT_SITE_NAME: 'liberty-mutual-agent-portal',
  SITECORE_EDITING_SECRET: 'HMi1EYl96aEZutHZLpug3',
};

function settingAssignments(contents, key) {
  const pattern = new RegExp(`^([ \\t]*(?:export[ \\t]+)?)(${key})([ \\t]*=[ \\t]*)([^\\r\\n]*)`, 'gm');
  const values = parseEnv(contents);
  let probe = '__PORTAL_SETUP_SETTING_PROBE__';
  while (Object.hasOwn(values, probe)) probe += '_';
  return [...contents.matchAll(pattern)].filter(match => {
    // Let Node's dotenv parser distinguish real assignments from lookalike text
    // inside an unrelated quoted multiline value. The probe never reaches disk.
    const index = match.index + match[1].length;
    const candidate = contents.slice(0, index) + probe + contents.slice(index + key.length);
    return Object.hasOwn(parseEnv(candidate), probe);
  });
}

function completeSitecoreSettings(contents) {
  const originalValues = parseEnv(contents);
  // Upgrade only the recognizable configuration created by the previous helper.
  // A developer's custom contexts, editing credentials and state stay intact.
  const legacySetup = originalValues.SITECORE_EDGE_CONTEXT_ID === '1bgqAWOiQogyKMCKoecyEY'
    && originalValues.NEXT_PUBLIC_SITECORE_EDGE_CONTEXT_ID === pocSettings.NEXT_PUBLIC_SITECORE_EDGE_CONTEXT_ID
    && originalValues.PORTAL_STATE_ADAPTER === 'local-json'
    && /^liberty-mutual-local-[0-9a-f]{12}$/.test(originalValues.PORTAL_ENVIRONMENT ?? '')
    && /^[0-9a-f]{64}$/.test(originalValues.SITECORE_EDITING_SECRET ?? '');
  const newline = contents.includes('\r\n') ? '\r\n' : '\n';
  let next = contents;
  for (const [key, fallback] of Object.entries(pocSettings)) {
    const assignments = settingAssignments(next, key);
    if (assignments.length > 1) {
      throw new Error(`Resolve duplicate ${key} assignments in .env.local before running setup:local. The file was not changed.`);
    }
    const migrate = legacySetup && ['SITECORE_EDGE_CONTEXT_ID', 'SITECORE_EDITING_SECRET'].includes(key);
    if (originalValues[key]?.trim() && !migrate) continue;
    if (!assignments.length) {
      next += (next && !next.endsWith('\n') ? newline : '') + `${key}=${fallback}${newline}`;
      continue;
    }
    const match = assignments[0];
    const raw = match[4];
    const quoted = /^(["'`])([^"'`\r\n]*)\1([ \t]*(?:#.*)?)$/.exec(raw);
    let value;
    if (quoted && (migrate || !quoted[2].trim())) value = quoted[1] + fallback + quoted[1] + quoted[3];
    else if (migrate && /^[^#"'`\r\n]+(?:#.*)?$/.test(raw)) {
      const suffix = /[ \t]*(?:#.*)?$/.exec(raw)[0];
      value = fallback + suffix;
    } else if (/^[ \t]*(?:#.*)?$/.test(raw)) value = fallback + (raw.includes('#') ? ' ' : '') + raw;
    else throw new Error(`Cannot safely update the ${key} assignment in .env.local. Put this setting on one line and rerun setup:local. The file was not changed.`);
    const replacement = match[1] + match[2] + match[3] + value;
    next = next.slice(0, match.index) + replacement + next.slice(match.index + match[0].length);
  }
  if (legacySetup) {
    const generatedComment = '# Generated for this machine only. Never copy production secrets or Redis settings here.';
    for (const [key, previous, before, after] of [
      ['SITECORE_EDGE_CONTEXT_ID',
        '# Server: approved Live content context. Browser: public-scoped child context.',
        '# Server: Preview content and Page Builder. Browser: public-scoped Search/analytics context.', ''],
      ['SITECORE_EDITING_SECRET', generatedComment,
        '# Matches this POC authoring environment so Page Builder can use Local host.',
        `${newline}${newline}${generatedComment}`],
    ]) {
      const assignment = settingAssignments(next, key)[0];
      const commentStart = assignment.index - previous.length - newline.length;
      // Only replace the exact helper comment directly above a real assignment.
      // Similar comments elsewhere (including quoted multiline text) stay intact.
      if (commentStart < 0 || (commentStart > 0 && next[commentStart - 1] !== '\n')
        || next.slice(commentStart, assignment.index) !== previous + newline) continue;
      next = next.slice(0, commentStart) + before + newline + assignment[0] + after
        + next.slice(assignment.index + assignment[0].length);
    }
  }
  const completed = parseEnv(next);
  if (completed.SITECORE_EDGE_CONTEXT_ID?.trim() === completed.NEXT_PUBLIC_SITECORE_EDGE_CONTEXT_ID?.trim()) {
    throw new Error('The server and browser Sitecore contexts must be different. Check their scopes before rerunning setup:local. The file was not changed.');
  }
  return next;
}

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
  const path = resolve(directory, '.env.local');
  let existing;
  try { existing = await readFile(path, 'utf8'); }
  catch (error) { if (error?.code !== 'ENOENT') throw error; }
  if (existing !== undefined) {
    const completed = completeSitecoreSettings(existing);
    if (completed === existing) return 'unchanged';
    // Abort if the file changed since our read; do not knowingly replace stale text.
    if (await readFile(path, 'utf8') !== existing) {
      throw new Error('.env.local changed during setup. Rerun setup:local after saving your editor changes.');
    }
    await writeFile(path, completed);
    return 'updated';
  }
  const secret = () => randomBytes(32).toString('hex');
  const contents = `# Local connected frontend workshop. Keep this file out of Git.
# Owner-approved defaults for this POC; replace Sitecore settings for another environment.
# Server: Preview content and Page Builder. Browser: public-scoped Search/analytics context.
SITECORE_EDGE_CONTEXT_ID=${pocSettings.SITECORE_EDGE_CONTEXT_ID}
NEXT_PUBLIC_SITECORE_EDGE_CONTEXT_ID=${pocSettings.NEXT_PUBLIC_SITECORE_EDGE_CONTEXT_ID}
NEXT_PUBLIC_SITECORE_EDGE_PLATFORM_HOSTNAME=https://edge-platform.sitecorecloud.io
NEXT_PUBLIC_DEFAULT_SITE_NAME=${pocSettings.NEXT_PUBLIC_DEFAULT_SITE_NAME}
NEXT_PUBLIC_DEFAULT_LANGUAGE=en
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Matches this POC authoring environment so Page Builder can use Local host.
SITECORE_EDITING_SECRET=${pocSettings.SITECORE_EDITING_SECRET}

# Generated for this machine only. Never copy production secrets or Redis settings here.
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
    await writeFile(path, contents, { flag: 'wx', mode: 0o600 });
    return 'created';
  } catch (error) {
    if (error?.code === 'EEXIST') {
      throw new Error('.env.local was created during setup. Rerun setup:local to safely check its Sitecore settings.');
    }
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const status = await setupLocal(process.cwd());
    const messages = {
      created: 'Created .env.local with POC Preview settings for Page Builder, the public browser context and isolated local state. Run npm ci, then npm run dev.',
      updated: 'Updated .env.local with missing POC settings or upgraded the previous local setup to Preview. Custom settings and local workspace state were preserved. Run npm ci, then npm run dev.',
      unchanged: '.env.local already has Sitecore settings and was left unchanged. Run npm ci, then npm run dev.',
    };
    console.log(messages[status]);
    console.log('Keep Redis settings absent from every local .env file and your terminal environment. Restart the dev server after changing environment values.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
