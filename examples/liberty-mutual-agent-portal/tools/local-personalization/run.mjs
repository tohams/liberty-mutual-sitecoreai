#!/usr/bin/env node
import { createRequire } from 'node:module';
import { randomBytes, X509Certificate } from 'node:crypto';
import { readFile, writeFile, appendFile, mkdir, chmod, access, lstat } from 'node:fs/promises';
import { resolve, join, dirname, relative, delimiter } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawn } from 'node:child_process';
import https from 'node:https';
import net from 'node:net';
import { createWorkspaceServer } from './workspace-service.mjs';
import { createHttpsRelay } from './https-relay.mjs';

const directoryName = '.portal-local-production';
const help = `Run from examples/liberty-mutual-agent-portal with Node.js 24:
  node tools/local-personalization/run.mjs prepare
  node tools/local-personalization/run.mjs build
  node tools/local-personalization/run.mjs start

prepare creates private local settings and a certificates directory.
Create a trusted localhost certificate using mkcert before build/start.
Existing certificates: prepare --ca-file <public-rootCA.pem>
Optional prepare ports: --https-port 3000 --app-port 3001 --store-port 6380
No Vercel or cloud Redis credentials are required. Existing .env.local is preserved.`;

export function parseArguments(args) {
  const [action, ...rest] = args;
  if (!['prepare', 'build', 'start'].includes(action)) throw new Error(help);
  const options = {};
  for (let index = 0; index < rest.length; index += 2) {
    const name = rest[index];
    const value = rest[index + 1];
    if (action !== 'prepare' || !['--ca-file', '--https-port', '--app-port', '--store-port'].includes(name) || !value || options[name]) {
      throw new Error(help);
    }
    options[name] = value;
  }
  const port = (name, fallback) => {
    const value = options[name] ?? String(fallback);
    if (!/^\d+$/.test(value) || Number(value) < 1024 || Number(value) > 65535) throw new Error('Choose localhost ports from 1024 through 65535.');
    return Number(value);
  };
  const ports = { httpsPort: port('--https-port', 3000), appPort: port('--app-port', 3001), storePort: port('--store-port', 6380) };
  if (new Set(Object.values(ports)).size !== 3) throw new Error('The three localhost ports must be different.');
  return { action, ports, caFile: options['--ca-file'] };
}

export function checkLocalEnvironment(environment) {
  if (environment.VERCEL) throw new Error('This helper runs only on a local developer machine.');
  for (const name of ['PORTAL_REDIS_REST_URL', 'KV_REST_API_URL']) {
    if (!environment[name]) continue;
    let url;
    try { url = new URL(environment[name]); } catch { throw new Error(`Remove the existing ${name} setting before using isolated local storage.`); }
    if (url.protocol !== 'https:' || url.hostname !== 'localhost' || url.username || url.password) {
      throw new Error(`Remove the cloud ${name} setting before using this isolated local helper.`);
    }
  }
  for (const name of ['SITECORE_EDGE_CONTEXT_ID', 'NEXT_PUBLIC_SITECORE_EDGE_CONTEXT_ID', 'NEXT_PUBLIC_DEFAULT_SITE_NAME']) {
    const value = environment[name];
    if (!value || value !== value.trim()) throw new Error(`Configure ${name} in .env.local; run npm run setup:local first.`);
  }
  if (environment.SITECORE_EDGE_CONTEXT_ID === environment.NEXT_PUBLIC_SITECORE_EDGE_CONTEXT_ID) {
    throw new Error('Use distinct server and scoped browser Sitecore Context IDs.');
  }
}

export function buildChildEnvironment(environment, settings, appDirectory) {
  const child = { ...environment };
  for (const name of ['KV_REST_API_URL', 'KV_REST_API_TOKEN', 'KV_REST_API_READ_ONLY_TOKEN', 'VERCEL', 'VERCEL_ENV']) delete child[name];
  Object.assign(child, {
    NODE_ENV: 'production',
    NODE_EXTRA_CA_CERTS: settings.caFile,
    NEXT_PUBLIC_SITE_URL: `https://localhost:${settings.httpsPort}`,
    NEXT_PUBLIC_PORTAL_TRACKING_ENABLED: 'true',
    PORTAL_VERIFIED_PROFILE_GENERATIONS: '0',
    PORTAL_ENVIRONMENT: settings.namespace,
    PORTAL_SESSION_SECRET: settings.sessionSecret,
    PORTAL_OPERATOR_SECRET: settings.operatorSecret,
    PORTAL_REDIS_REST_URL: `https://localhost:${settings.storePort}`,
    PORTAL_REDIS_REST_TOKEN: settings.token,
    PORTAL_STATE_ADAPTER: 'redis',
    PORTAL_CONTENT_ADAPTER: 'sitecore',
    PORTAL_PERSONALIZATION_DIAGNOSTICS: 'false',
    PATH: dirname(process.execPath) + delimiter + (environment.PATH ?? environment.Path ?? ''),
    PWD: appDirectory,
  });
  return child;
}

function validateSettings(settings) {
  if (settings?.version !== 1 || !/^local-personalization-[a-f0-9]{12}$/.test(settings.namespace) ||
      !['token', 'sessionSecret', 'operatorSecret'].every(name => /^[a-f0-9]{64}$/.test(settings[name])) ||
      typeof settings.caFile !== 'string' || !settings.caFile ||
      !['httpsPort', 'appPort', 'storePort'].every(name => Number.isInteger(settings[name]) && settings[name] >= 1024 && settings[name] <= 65535) ||
      new Set([settings.httpsPort, settings.appPort, settings.storePort]).size !== 3) {
    throw new Error('Local settings are invalid. Restore the original settings file or prepare a new local workspace.');
  }
}

async function privateDirectory(path) {
  try { if ((await lstat(path)).isSymbolicLink()) throw new Error('The local settings directory must not be a symbolic link.'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  await mkdir(path, { recursive: true, mode: 0o700 });
  await chmod(path, 0o700);
}

async function excludePrivateFiles(appDirectory) {
  const repository = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: appDirectory, encoding: 'utf8' }).trim();
  const exclude = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-path', 'info/exclude'], { cwd: appDirectory, encoding: 'utf8' }).trim();
  const appPath = relative(repository, appDirectory).split('\\').join('/');
  const entry = name => `/${appPath ? appPath + '/' : ''}${name}/`;
  let text = '';
  try { text = await readFile(exclude, 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const missing = [entry(directoryName), entry('certificates')].filter(line => !text.split(/\r?\n/).includes(line));
  if (missing.length) {
    await mkdir(dirname(exclude), { recursive: true });
    await appendFile(exclude, (text.endsWith('\n') || !text ? '' : '\n') + missing.join('\n') + '\n');
  }
}

async function readSettings(appDirectory) {
  const path = join(appDirectory, directoryName, 'settings.json');
  let settings;
  try {
    if ((await lstat(path)).isSymbolicLink()) throw new Error('The local settings file must not be a symbolic link.');
    const text = await readFile(path, 'utf8');
    try { settings = JSON.parse(text); } catch { throw new Error('Local settings are invalid. Restore the original settings file.'); }
  } catch (error) {
    if (error.code === 'ENOENT') throw new Error('Run the prepare command first.');
    throw error;
  }
  validateSettings(settings);
  return settings;
}

async function certificates(appDirectory, settings) {
  let cert, key, ca;
  try {
    [cert, key, ca] = await Promise.all([
      readFile(join(appDirectory, 'certificates', 'localhost.pem')),
      readFile(join(appDirectory, 'certificates', 'localhost-key.pem')),
      readFile(settings.caFile),
    ]);
  } catch {
    throw new Error('Create the trusted localhost certificate described in tools/local-personalization/README.txt, then rerun prepare if its public root CA path has changed.');
  }
  const leaf = new X509Certificate(cert);
  const root = new X509Certificate(ca);
  if (!leaf.checkHost('localhost') || Date.parse(leaf.validTo) <= Date.now() || Date.parse(leaf.validFrom) > Date.now() || !leaf.verify(root.publicKey)) {
    throw new Error('The localhost certificate must be valid and signed by the public root CA recorded during prepare.');
  }
  await chmod(join(appDirectory, 'certificates', 'localhost-key.pem'), 0o600);
  return { cert, key, ca };
}

async function prepare(appDirectory, arguments_) {
  await excludePrivateFiles(appDirectory);
  await privateDirectory(join(appDirectory, directoryName));
  await mkdir(join(appDirectory, 'certificates'), { recursive: true });
  let caFile = arguments_.caFile;
  if (!caFile) {
    try { caFile = join(execFileSync('mkcert', ['-CAROOT'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim(), 'rootCA.pem'); }
    catch { throw new Error('Install mkcert and place it on PATH, or supply prepare --ca-file <public-rootCA.pem>.'); }
  }
  caFile = resolve(caFile);
  const path = join(appDirectory, directoryName, 'settings.json');
  let settings;
  try { settings = await readSettings(appDirectory); }
  catch (error) { if (error.message !== 'Run the prepare command first.') throw error; }
  if (settings) {
    if (settings.caFile !== caFile || Object.keys(arguments_.ports).some(name => arguments_.ports[name] !== settings[name])) {
      throw new Error('Private local settings already exist with different ports or a different public CA. Reuse their original prepare options.');
    }
    console.log('Existing private local settings retained.');
  } else {
    settings = { version: 1, ...arguments_.ports, caFile,
      namespace: `local-personalization-${randomBytes(6).toString('hex')}`,
      token: randomBytes(32).toString('hex'), sessionSecret: randomBytes(32).toString('hex'), operatorSecret: randomBytes(32).toString('hex') };
    await writeFile(path, JSON.stringify(settings, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    console.log('Created private settings for isolated local workspace storage.');
  }
  console.log('Use accounts ending in .01 for the documented personalization checks.');
  console.log('Create or reuse certificates/localhost.pem and certificates/localhost-key.pem, then run build and start.');
}

function npmProcess(action, settings, environment, appDirectory) {
  const args = action === 'start' ? ['run', 'start', '--', '--hostname', 'localhost', '--port', String(settings.appPort)] : ['run', 'build'];
  console.log(action === 'start' ? `Running npm run start -- --hostname localhost --port ${settings.appPort}` : 'Running npm run build with personalization tracking enabled.');
  return spawn('npm', args, { cwd: appDirectory, env: buildChildEnvironment(environment, settings, appDirectory),
    stdio: 'inherit', shell: process.platform === 'win32', detached: process.platform !== 'win32' });
}
function stopChild(child) {
  if (!child?.pid || child.exitCode !== null || child.signalCode !== null) return;
  try {
    if (process.platform === 'win32') execFileSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' });
    else process.kill(-child.pid, 'SIGTERM');
  } catch (error) { if (error.code !== 'ESRCH') child.kill('SIGTERM'); }
}
function listen(server, port) {
  return new Promise((resolve_, reject) => {
    const error = () => reject(new Error(`Localhost port ${port} is unavailable. Stop the local process using that port, then retry.`));
    server.once('error', error);
    server.listen(port, 'localhost', () => { server.off('error', error); resolve_(); });
  });
}
function probe(settings, ca) {
  return new Promise((resolve_, reject) => {
    const request = https.get(`https://localhost:${settings.httpsPort}/login`, { ca, timeout: 2000 }, response => {
      response.resume();
      response.on('end', () => response.statusCode === 200 ? resolve_() : reject(new Error('Local application is starting.')));
    });
    request.on('timeout', () => request.destroy(new Error('Local application is starting.')));
    request.on('error', reject);
  });
}
export async function requireFreeApplicationPort(port) {
  const reservation = net.createServer();
  await listen(reservation, port);
  await new Promise((resolve_, reject) => reservation.close(error => error ? reject(error) : resolve_()));
}

async function run(appDirectory, arguments_, environment) {
  const settings = await readSettings(appDirectory);
  const tls = await certificates(appDirectory, settings);
  const servers = [];
  let child;
  let stopping = false;
  const stop = code => {
    if (stopping) return;
    stopping = true;
    stopChild(child);
    for (const server of servers) { server.closeAllConnections(); server.close(); }
    process.exitCode = code;
  };
  const interrupt = () => stop(0);
  process.once('SIGINT', interrupt);
  process.once('SIGTERM', interrupt);
  try {
    if (arguments_.action === 'start') {
      await access(join(appDirectory, '.next', 'BUILD_ID')).catch(() => { throw new Error('Run the build command before starting production mode.'); });
      await requireFreeApplicationPort(settings.appPort);
      const workspace = createWorkspaceServer({ stateDirectory: join(appDirectory, directoryName, 'state'), keyPrefix: `lm-portal:v1:${settings.namespace}:`,
        token: settings.token, cert: tls.cert, key: tls.key, port: settings.storePort });
      servers.push(workspace);
      await listen(workspace, settings.storePort);
      const relay = createHttpsRelay({ cert: tls.cert, key: tls.key, httpsPort: settings.httpsPort, appPort: settings.appPort });
      servers.push(relay);
      await listen(relay, settings.httpsPort);
    }
    child = npmProcess(arguments_.action, settings, environment, appDirectory);
    let childError = false;
    const result = new Promise(resolve_ => { child.once('error', () => { childError = true; resolve_(1); }); child.once('exit', code => resolve_(code ?? 1)); });
    if (arguments_.action === 'start') {
      const deadline = Date.now() + 30000;
      let ready = false;
      while (!ready && !stopping && !childError && child.exitCode === null && child.signalCode === null && Date.now() < deadline) {
        try { await probe(settings, tls.ca); ready = true; }
        catch { await new Promise(resolve_ => setTimeout(resolve_, 200)); }
      }
      if (childError) throw new Error('npm could not start. Check Node.js and npm on PATH.');
      if (!ready && !stopping) throw new Error('The production application did not become ready. Review the npm output in this terminal.');
      if (ready && !stopping) console.log(`Ready: https://localhost:${settings.httpsPort}/login — keep this terminal open; Ctrl+C stops all three local services.`);
    }
    const code = await result;
    if (childError) throw new Error('npm could not start. Check Node.js and npm on PATH.');
    stop(stopping ? process.exitCode ?? 0 : code);
  } catch (error) { stop(1); throw error; }
  finally { process.off('SIGINT', interrupt); process.off('SIGTERM', interrupt); }
}

export async function main(args = process.argv.slice(2)) {
  if (Number(process.versions.node.split('.')[0]) !== 24) throw new Error('Use Node.js 24. The project was verified with 24.19.0.');
  const arguments_ = parseArguments(args);
  const appDirectory = process.cwd();
  const manifest = JSON.parse(await readFile(join(appDirectory, 'package.json'), 'utf8').catch(() => { throw new Error('Run from examples/liberty-mutual-agent-portal, not the repository root.'); }));
  if (manifest.name !== 'liberty-mutual-agent-portal') throw new Error('Run from the Liberty Mutual agent portal application directory.');
  await access(join(appDirectory, 'src', 'app', 'api', 'portal', 'identity', 'route.ts')).catch(() => {
    throw new Error('Update your repository to include the login-readiness fix before using the local personalization helper.');
  });
  const require_ = createRequire(join(appDirectory, 'package.json'));
  let environment;
  try { environment = require_('@next/env').loadEnvConfig(appDirectory, false, { info() {}, error() {} }).combinedEnv; }
  catch { throw new Error('Run npm ci and npm run setup:local in the application directory first.'); }
  checkLocalEnvironment(environment);
  if (arguments_.action === 'prepare') await prepare(appDirectory, arguments_);
  else await run(appDirectory, arguments_, environment);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
