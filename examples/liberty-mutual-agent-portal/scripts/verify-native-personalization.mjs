#!/usr/bin/env node
// Opt-in acceptance of deployed SSR behavior. Never loads environment credentials.
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { readPortalBrowserProfileRef, waitForPortalProfileLink } from '../src/lib/portal-identity-link.ts';

const HOSTS = new Set([
  'liberty-mutual-agent-portal.vercel.app',
  'liberty-mutual-sitecor-git-c8199e-thomas-lins-projects-67630b98.vercel.app',
]);
// Reviewed public browser scope, never an environment master ID. Update only
// after the replacement scope and matching deployment configuration are reviewed.
const PUBLIC_CONTEXTS = new Set(['6SCkrPfaQoiQEiAK6wMIEe']);
const EDGE_URL = 'https://edge-platform.sitecorecloud.io';
const PERSONAS = [
  { label: 'Avery', agent: 'avery', variant: 'principal' },
  { label: 'Jordan', agent: 'jordan', variant: 'producer' },
  { label: 'Maya', agent: 'maya', variant: 'account-manager' },
  { label: 'Elena', agent: 'elena', variant: 'neutral' },
];
const BROWSER_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const HELP = `Native personalization acceptance (no network without explicit arguments)
  node --import tsx scripts/verify-native-personalization.mjs --origin <allowed-HTTPS-origin> --pack <01|02|03|04> --public-context <reviewed-public-context>
  node --import tsx scripts/verify-native-personalization.mjs --origin http://localhost:3000 --pack <01|02|03|04> --public-context <reviewed-public-context> --allow-localhost
  node --import tsx scripts/verify-native-personalization.mjs --origin <allowed-HTTPS-origin> --pack <01|02|03|04> --public-context <reviewed-public-context> --measure-link
  node --import tsx scripts/verify-native-personalization.mjs --self-test

Allowed remote origins:
${[...HOSTS].map((host) => `  https://${host}`).join('\n')}

Uses the private fixtures/portal-logins.json file. Does not print credentials,
cookies, response bodies, or identifiers. Does not reset saved work or profiles.
The public context must match the compiled deployment; master IDs are rejected.
Reproduces login's public browser/IDENTITY/profile-link sequence. Two workspace
requests are strict separate assertions, never decision retries.
--measure-link is a separate diagnostic: observes native profile linking for up
to 10 seconds, makes no workspace/decision requests, and does not change or pass
the strict six-second acceptance gate. Prints only statuses, timings, and safe
cache-control/age/x-cache metadata; preserves all previous acceptance results.`;

function options(args) {
  const result = {};
  for (let index = 0; index < args.length; index++) {
    const key = args[index];
    if (key === '--allow-localhost') result.local = true;
    else if (key === '--measure-link') result.measureLink = true;
    else if (['--origin', '--pack', '--public-context'].includes(key) && args[index + 1] && !args[index + 1].startsWith('--')) {
      if (result[key.slice(2)]) throw new Error('ARGUMENTS');
      result[key.slice(2)] = args[++index];
    } else throw new Error('ARGUMENTS');
  }
  if (!result.origin || !/^0[1-4]$/.test(result.pack ?? '') || !PUBLIC_CONTEXTS.has(result['public-context'])) throw new Error('ARGUMENTS');
  const url = new URL(result.origin);
  if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('ARGUMENTS');
  const remote = url.protocol === 'https:' && !url.port && HOSTS.has(url.hostname);
  const local = result.local === true && url.hostname === 'localhost' && ['http:', 'https:'].includes(url.protocol);
  if (!remote && !local) throw new Error('ARGUMENTS');
  return { origin: url.origin, pack: result.pack, publicContext: result['public-context'], measureLink: result.measureLink === true };
}

function decodeText(value) {
  return value.replace(/&(?:#x([\da-f]+)|#(\d+)|(amp|lt|gt|quot|apos|nbsp));/gi, (all, hex, decimal, name) => {
    if (hex || decimal) {
      const point = Number.parseInt(hex || decimal, hex ? 16 : 10);
      return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : '\ufffd';
    }
    return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }[name.toLowerCase()] ?? all;
  });
}

// A conservative scanner of actual SSR element markup, not a search over the
// document string. Script/RSC, comments, raw-text nodes, templates, hidden trees,
// and React's hidden streaming containers cannot satisfy the assertion. This
// verifies SSR markup; CSS layout and post-hydration visibility remain browser QA.
function renderedGuidanceHeadlines(html) {
  const stack = [];
  const headlines = [];
  const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
  const rawTags = new Set(['script', 'style', 'textarea', 'title', 'xmp', 'iframe', 'noembed', 'noframes', 'noscript']);
  let at = 0;
  const addText = (text) => {
    if (stack.some((element) => element.hidden)) return;
    const heading = stack.findLast((element) => element.heading);
    if (heading) heading.text += decodeText(text);
  };
  while (at < html.length) {
    if (html.startsWith('<!--', at)) {
      const end = html.indexOf('-->', at + 4);
      if (end < 0) throw new Error('MARKUP');
      at = end + 3;
      continue;
    }
    if (html[at] !== '<') {
      const end = html.indexOf('<', at);
      addText(html.slice(at, end < 0 ? html.length : end));
      at = end < 0 ? html.length : end;
      continue;
    }
    const token = html.slice(at).match(/^<(?:[^>"']|"[^"]*"|'[^']*')*>/);
    if (!token) throw new Error('MARKUP');
    at += token[0].length;
    if (/^<!|^<\?/.test(token[0])) continue;
    const tagMatch = token[0].match(/^<(\/?)\s*([a-z][\w:-]*)/i);
    if (!tagMatch) throw new Error('MARKUP');
    const tag = tagMatch[2].toLowerCase();
    if (tagMatch[1]) {
      const index = stack.findLastIndex((element) => element.tag === tag);
      if (index < 0) continue;
      const removed = stack.splice(index);
      for (const element of removed) {
        if (element.heading && !element.hidden) headlines.push(element.text.replace(/\s+/g, ' ').trim());
      }
      continue;
    }
    const attributes = new Map();
    const attributeText = token[0].slice(tagMatch[0].length, -1);
    for (const match of attributeText.matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
      if (attributes.has(match[1].toLowerCase())) throw new Error('MARKUP');
      attributes.set(match[1].toLowerCase(), decodeText(match[2] ?? match[3] ?? match[4] ?? ''));
    }
    if (rawTags.has(tag)) {
      const close = new RegExp(`</${tag}\\s*>`, 'gi');
      close.lastIndex = at;
      const match = close.exec(html);
      if (!match) throw new Error('MARKUP');
      at = close.lastIndex;
      continue;
    }
    const hidden = stack.some((element) => element.hidden) || tag === 'template' ||
      attributes.has('hidden') || attributes.get('aria-hidden')?.toLowerCase() === 'true' ||
      /(?:^|;)\s*(?:display\s*:\s*none|visibility\s*:\s*(?:hidden|collapse))(?:\s*!important)?\s*(?:;|$)/i.test(attributes.get('style') ?? '');
    const guidance = !hidden && tag === 'aside' && attributes.get('aria-label') === 'Agent guidance';
    const heading = !hidden && tag === 'h2' && stack.some((element) => element.guidance);
    if (!voidTags.has(tag) && !/\/\s*>$/.test(token[0])) stack.push({ tag, hidden, guidance, heading, text: '' });
  }
  if (stack.some((element) => element.heading)) throw new Error('MARKUP');
  return headlines;
}

class MemoryCookies {
  values = new Map();

  accept(response, requestUrl) {
    for (const line of response.headers.getSetCookie()) {
      const [pair, ...parts] = line.split(';');
      const separator = pair.indexOf('=');
      if (separator < 1) continue;
      const name = pair.slice(0, separator).trim();
      const value = pair.slice(separator + 1).trim();
      const attributes = new Map(parts.map((part) => {
        const [key, ...rest] = part.trim().split('=');
        return [key.toLowerCase(), rest.join('=')];
      }));
      if (attributes.has('domain') && attributes.get('domain').replace(/^\./, '') !== requestUrl.hostname) continue;
      const cookiePath = attributes.get('path') || requestUrl.pathname.slice(0, requestUrl.pathname.lastIndexOf('/') + 1) || '/';
      const expires = attributes.has('max-age') ? Date.now() + Number(attributes.get('max-age')) * 1000 :
        attributes.has('expires') ? Date.parse(attributes.get('expires')) : Infinity;
      const key = `${name}\n${cookiePath}`;
      if (!value || expires <= Date.now()) this.values.delete(key);
      else this.values.set(key, { name, value, path: cookiePath, expires, secure: attributes.has('secure'), httpOnly: attributes.has('httponly') });
    }
  }

  header(url) {
    return [...this.values.values()].filter((cookie) => cookie.expires > Date.now() &&
      (!cookie.secure || url.protocol === 'https:' || url.hostname === 'localhost') &&
      (url.pathname === cookie.path || url.pathname.startsWith(cookie.path.endsWith('/') ? cookie.path : `${cookie.path}/`)))
      .map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');
  }

  hasProtectedSession(origin) {
    return [...this.values.values()].some((cookie) => cookie.name === 'lm_portal_session' &&
      cookie.httpOnly && (origin.startsWith('http://localhost') || cookie.secure) && cookie.expires > Date.now());
  }

  setBrowserIdentity(browserId, origin) {
    this.values.set('sc_cid\n/', {
      name: 'sc_cid', value: browserId, path: '/', expires: Infinity,
      secure: origin.startsWith('https:'), httpOnly: false,
    });
  }

  clear() { this.values.clear(); }
}

async function request(origin, path, jar, body, content = 'none') {
  const started = performance.now();
  const url = new URL(path, origin);
  let status = 0;
  try {
    const cookie = jar.header(url);
    const response = await fetch(url, {
      method: body ? 'POST' : 'GET', redirect: 'manual', signal: AbortSignal.timeout(40_000),
      headers: {
        'User-Agent': BROWSER_UA, Accept: body || content === 'json' ? 'application/json' : 'text/html',
        'Cache-Control': 'no-cache', ...(cookie ? { Cookie: cookie } : {}),
        ...(body ? { Origin: origin, 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    status = response.status;
    jar.accept(response, url);
    let html = '';
    if (content !== 'none') {
      if (!response.headers.get('content-type')?.includes(content === 'html' ? 'text/html' : 'application/json')) throw new Error('MARKUP');
      const reader = response.body?.getReader();
      if (!reader) throw new Error('MARKUP');
      const decoder = new TextDecoder();
      let bytes = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          bytes += value.byteLength;
          if (bytes > 5_000_000) throw new Error('MARKUP');
          html += decoder.decode(value, { stream: true });
        }
        html += decoder.decode();
      } finally { await reader.cancel().catch(() => {}); }
    } else await response.body?.cancel();
    const location = response.headers.get('location');
    let loginRedirect = false;
    if ([302, 303, 307, 308].includes(status) && location) {
      const target = new URL(location, origin);
      loginRedirect = target.origin === origin && target.pathname === '/login';
    }
    const json = content === 'json' ? JSON.parse(html) : undefined;
    return { status, ms: Math.round(performance.now() - started), html: content === 'html' ? html : '', json, loginRedirect, ok: true };
  } catch {
    // Native errors can include request headers or server content: never log them.
    return { status, ms: Math.round(performance.now() - started), html: '', loginRedirect: false, ok: false };
  }
}

async function expectations(pack) {
  const source = JSON.parse(await readFile(new URL('../fixtures/portal-logins.json', import.meta.url), 'utf8'));
  return Promise.all(PERSONAS.map(async (persona) => {
    const logins = source.logins.filter((login) => login.agentId === persona.agent && login.reviewerPack === pack && login.enabled === true);
    if (logins.length !== 1 || typeof logins[0].username !== 'string' || typeof logins[0].password !== 'string') throw new Error('FIXTURES');
    const seed = await readFile(new URL(`../../../authoring/items/liberty-mutual/items/content/LibertyMutual/liberty-mutual-agent-portal/Data/Guidance/commercial-growth-${persona.variant}.yml`, import.meta.url), 'utf8');
    const values = [...seed.matchAll(/^\s+Hint: headline\r?\n\s+Value: ([^\r\n]+)$/gm)];
    if (values.length !== 1) throw new Error('FIXTURES');
    const headline = values[0][1].startsWith('"') ? JSON.parse(values[0][1]) : values[0][1];
    if (typeof headline !== 'string' || !headline || /^[|>']/.test(headline)) throw new Error('FIXTURES');
    return { ...persona, headline, login: { username: logins[0].username, password: logins[0].password } };
  }));
}

async function nativeRequest(config, path, body, parentSignal) {
  const started = performance.now();
  let status = 0;
  try {
    const response = await fetch(`${EDGE_URL}${path}`, {
      method: body ? 'POST' : 'GET', redirect: 'error', credentials: 'omit', cache: 'no-store',
      signal: AbortSignal.any([AbortSignal.timeout(2000), ...(parentSignal ? [parentSignal] : [])]),
      headers: {
        Origin: config.origin, 'User-Agent': BROWSER_UA,
        'x-sitecore-contextid': config.publicContext,
        'X-Library-Version': body ? config.sdk.events.version : config.sdk.analytics.version,
        ...(body ? {
          'Content-Type': 'application/json',
          'X-Client-Software-ID': `${config.sdk.events.name} ${config.sdk.events.version}`,
        } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    status = response.status;
    const json = await response.json();
    return { status, ms: Math.round(performance.now() - started), json, ok: response.ok };
  } catch { return { status, ms: Math.round(performance.now() - started), ok: false }; }
}

async function linkNativeBrowser(config, verifiedIdentity, jar, label, report) {
  const created = await nativeRequest(config, '/v1/events/v1.2/browser/create.json?client_key=');
  const browserId = created.json?.ref;
  const baseline = created.json?.customer_ref;
  const valid = created.status === 201 && typeof browserId === 'string' && /^[a-zA-Z0-9-]{1,200}$/.test(browserId) &&
    typeof baseline === 'string' && baseline.length > 0;
  report(label, 'native browser create', created, valid);
  if (!valid) return false;
  jar.setBrowserIdentity(browserId, config.origin);
  let identityReceipt = { status: 0, ms: 0, ok: false };
  let lastReadStatus = 0;
  const started = performance.now();
  const ready = await waitForPortalProfileLink({
    readProfileRef: async (signal) => {
      const ref = await readPortalBrowserProfileRef({
        edgeUrl: EDGE_URL, contextId: config.publicContext, browserId,
      }, signal, async (input, init) => {
        const response = await fetch(input, {
          ...init, redirect: 'error',
          headers: { ...init.headers, Origin: config.origin, 'User-Agent': BROWSER_UA },
        });
        lastReadStatus = response.status;
        return response;
      });
      return ref;
    },
    identify: async (signal) => {
      // Exact documented identity payload, sourced only from authenticated bootstrap.
      identityReceipt = await nativeRequest(config, '/v1/events/v1.2/events?siteId=liberty-mutual-agent-portal', {
        type: 'IDENTITY', identifiers: [verifiedIdentity], browser_id: browserId,
        channel: 'WEB', client_key: '', currency: 'USD', language: 'EN',
        page: 'Agent workspace', pos: '', requested_at: new Date().toISOString(),
      }, signal);
      return identityReceipt.status === 201 && identityReceipt.ok ? identityReceipt.json : null;
    },
  });
  report(label, 'native identity receipt', identityReceipt, identityReceipt.status === 201 && identityReceipt.ok);
  report(label, 'profile link readiness', { status: lastReadStatus, ms: Math.round(performance.now() - started) }, ready);
  return ready;
}

async function acceptance(config) {
  const personas = await expectations(config.pack); // Validate local inputs before any network operation.
  config.sdk = await installedSdkMetadata();
  let failures = 0;
  const report = (label, step, result, match) => {
    if (!match) failures++;
    console.log(`${label} | ${step} | HTTP ${result.status || 'unavailable'} | ${result.ms} ms | expectation ${match ? 'PASS' : 'FAIL'}`);
  };
  const anonymous = new MemoryCookies();
  const initial = await request(config.origin, '/', anonymous);
  report('Signed out', 'workspace redirect', initial, initial.ok && initial.loginRedirect);
  anonymous.clear();
  for (const persona of personas) {
    const jar = new MemoryCookies();
    try {
      const login = await request(config.origin, '/api/auth/login', jar, persona.login);
      const authenticated = login.ok && login.status === 200 && jar.hasProtectedSession(config.origin);
      report(persona.label, 'login and protected session', login, authenticated);
      if (authenticated) {
        const bootstrap = await request(config.origin, '/api/portal/bootstrap', jar, undefined, 'json');
        const verifiedIdentity = bootstrap.json?.udlIdentity;
        const hasVerifiedIdentity = bootstrap.status === 200 && bootstrap.ok &&
          verifiedIdentity?.provider === 'liberty-mutual-agent' &&
          typeof verifiedIdentity.id === 'string' && verifiedIdentity.id.length > 0;
        report(persona.label, 'authenticated bootstrap identity', bootstrap, hasVerifiedIdentity);
        if (hasVerifiedIdentity) {
          await linkNativeBrowser(config, { provider: verifiedIdentity.provider, id: verifiedIdentity.id }, jar, persona.label, report);
        }
        // Continue observing fallback even when native readiness failed; never retry a decision.
        for (const step of ['firstMatched', 'secondMatched']) {
          const page = await request(config.origin, '/', jar, undefined, 'html');
          let match = false;
          try {
            const headlines = renderedGuidanceHeadlines(page.html);
            match = page.ok && page.status === 200 && headlines.length === 1 && headlines[0] === persona.headline;
          } catch { /* A malformed or ambiguous document fails closed. */ }
          report(persona.label, step, page, match);
        }
      }
    } finally {
      const logout = await request(config.origin, '/api/auth/logout', jar, {});
      report(persona.label, 'logout', logout, logout.ok && logout.status === 200);
      const signedOut = await request(config.origin, '/', jar);
      report(persona.label, 'signed-out workspace redirect', signedOut, signedOut.ok && signedOut.loginRedirect);
      jar.clear();
    }
  }
  console.log(`Overall: ${failures === 0 ? 'PASS' : 'FAIL'} (${failures} failed assertions). No decision retries or resets performed.`);
  return failures === 0 ? 0 : 1;
}

async function installedSdkMetadata() {
  const packages = await Promise.all(['analytics-core', 'events'].map(async (name) => {
    const metadata = JSON.parse(await readFile(new URL(`../node_modules/@sitecore-content-sdk/${name}/package.json`, import.meta.url), 'utf8'));
    if (metadata.name !== `@sitecore-content-sdk/${name}` || !/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(metadata.version)) throw new Error('SDK_METADATA');
    return { name: metadata.name, version: metadata.version };
  }));
  return { analytics: packages[0], events: packages[1] };
}

function safeCacheMetadata(headers) {
  return ['cache-control', 'age', 'x-cache'].flatMap((name) => {
    const value = headers.get(name);
    if (value === null) return [];
    // Only these caching headers may be printed, with bounded ordinary text.
    return [`${name}=${/^[a-zA-Z0-9 ,.;:=_()/-]{0,120}$/.test(value) ? value : '[present]'}`];
  }).join(' | ');
}

async function measureBrowserLink(config, verifiedIdentity, jar, label) {
  const created = await nativeRequest(config, '/v1/events/v1.2/browser/create.json?client_key=');
  console.log(`${label} | native browser create | HTTP ${created.status || 'unavailable'} | ${created.ms} ms`);
  const browserId = created.json?.ref;
  if (created.status !== 201 || typeof browserId !== 'string' || !/^[a-zA-Z0-9-]{1,200}$/.test(browserId)) return false;
  jar.setBrowserIdentity(browserId, config.origin);
  const started = performance.now();
  const signal = AbortSignal.timeout(10_000);
  let identityAcceptedAt;
  let observation = 0;
  const read = async () => {
    const readStarted = performance.now();
    let status = 0;
    let cache = '';
    const ref = await readPortalBrowserProfileRef({ edgeUrl: EDGE_URL, contextId: config.publicContext, browserId }, signal, async (input, init) => {
      const response = await fetch(input, {
        ...init, redirect: 'error',
        headers: { ...init.headers, Origin: config.origin, 'User-Agent': BROWSER_UA },
      });
      status = response.status;
      cache = safeCacheMetadata(response.headers);
      return response;
    });
    const elapsed = Math.round(performance.now() - (identityAcceptedAt ?? started));
    console.log(`${label} | ${identityAcceptedAt === undefined ? 'baseline read' : `profile read ${++observation}`} | HTTP ${status || 'unavailable'} | ${Math.round(performance.now() - readStarted)} ms | ${identityAcceptedAt === undefined ? 'diagnostic' : 'since identity receipt'} ${elapsed} ms${cache ? ` | ${cache}` : ''}`);
    return ref;
  };
  const baseline = await read();
  if (!baseline || signal.aborted) return false;
  const receipt = await nativeRequest(config, '/v1/events/v1.2/events?siteId=liberty-mutual-agent-portal', {
    type: 'IDENTITY', identifiers: [verifiedIdentity], browser_id: browserId,
    channel: 'WEB', client_key: '', currency: 'USD', language: 'EN',
    page: 'Agent workspace', pos: '', requested_at: new Date().toISOString(),
  }, signal);
  console.log(`${label} | native identity receipt | HTTP ${receipt.status || 'unavailable'} | ${receipt.ms} ms`);
  if (receipt.status !== 201 || !receipt.ok || signal.aborted) return false;
  identityAcceptedAt = performance.now();
  let attempt = 0;
  while (!signal.aborted && performance.now() - started < 10_000) {
    const current = await read();
    if (current && current !== baseline && !signal.aborted && performance.now() - started < 10_000) {
      console.log(`${label} | profile link observed | since identity receipt ${Math.round(performance.now() - identityAcceptedAt)} ms | diagnostic ${Math.round(performance.now() - started)} ms`);
      return true;
    }
    const remaining = 10_000 - (performance.now() - started);
    if (signal.aborted || remaining <= 0) break;
    await new Promise((resolve) => setTimeout(resolve, Math.min([200, 350, 500][Math.min(attempt++, 2)], remaining)));
  }
  console.log(`${label} | profile link not observed | diagnostic ${Math.round(performance.now() - started)} ms`);
  return false;
}

async function measureLinks(config) {
  const personas = await expectations(config.pack);
  config.sdk = await installedSdkMetadata();
  let failures = 0;
  console.log('Link measurement only. No workspace/decision requests. Strict acceptance remains unchanged.');
  for (const persona of personas) {
    const jar = new MemoryCookies();
    try {
      const login = await request(config.origin, '/api/auth/login', jar, persona.login);
      const authenticated = login.ok && login.status === 200 && jar.hasProtectedSession(config.origin);
      console.log(`${persona.label} | login | HTTP ${login.status || 'unavailable'} | ${login.ms} ms`);
      if (!authenticated) { failures++; continue; }
      const bootstrap = await request(config.origin, '/api/portal/bootstrap', jar, undefined, 'json');
      const identity = bootstrap.json?.udlIdentity;
      const verified = bootstrap.ok && bootstrap.status === 200 && identity?.provider === 'liberty-mutual-agent' && typeof identity.id === 'string' && identity.id.length > 0;
      console.log(`${persona.label} | authenticated bootstrap | HTTP ${bootstrap.status || 'unavailable'} | ${bootstrap.ms} ms`);
      if (!verified) { failures++; continue; }
      const linked = await measureBrowserLink(config, { provider: identity.provider, id: identity.id }, jar, persona.label);
      if (!linked) failures++;
    } finally {
      const logout = await request(config.origin, '/api/auth/logout', jar, {});
      console.log(`${persona.label} | logout | HTTP ${logout.status || 'unavailable'} | ${logout.ms} ms`);
      if (!logout.ok || logout.status !== 200) failures++;
      // An API check proves sign-out without triggering a page personalization decision.
      const anonymous = await request(config.origin, '/api/portal/bootstrap', jar);
      console.log(`${persona.label} | signed-out bootstrap | HTTP ${anonymous.status || 'unavailable'} | ${anonymous.ms} ms`);
      if (!anonymous.ok || anonymous.status !== 401) failures++;
      jar.clear();
    }
  }
  console.log(`Link measurement finished: ${failures} unavailable or failed observations. This is not an acceptance rerun.`);
  return failures === 0 ? 0 : 1;
}

async function selfTest() {
  const { strict: assert } = await import('node:assert');
  const wanted = '<aside aria-label="Agent guidance"><div><h2>Correct <span>headline</span></h2></div></aside>';
  assert.deepEqual(renderedGuidanceHeadlines(wanted), ['Correct headline']);
  assert.deepEqual(renderedGuidanceHeadlines(`<script>self.__next_f.push([${JSON.stringify(wanted)}])</script>`), []);
  assert.deepEqual(renderedGuidanceHeadlines(`<!--${wanted}--><template>${wanted}</template><div hidden>${wanted}</div>`), []);
  assert.deepEqual(renderedGuidanceHeadlines(`<div aria-hidden="true">${wanted}</div><div style="display:none">${wanted}</div>`), []);
  assert.deepEqual(renderedGuidanceHeadlines(`<div hidden id="S:1">${wanted}</div><script>"$RC"</script>`), []);
  assert.deepEqual(renderedGuidanceHeadlines(wanted + wanted), ['Correct headline', 'Correct headline']);
  assert.deepEqual(renderedGuidanceHeadlines('<aside aria-label="Agent guidance"><h2>A &amp; B &#x26; C</h2></aside>'), ['A & B & C']);
  assert.throws(() => renderedGuidanceHeadlines('<aside aria-label="other" aria-label="Agent guidance"><h2>Misleading</h2></aside>'));
  assert.throws(() => options([]));
  const publicArgs = ['--public-context', [...PUBLIC_CONTEXTS][0]];
  assert.throws(() => options(['--origin', 'https://example.com', '--pack', '04', ...publicArgs]));
  assert.throws(() => options(['--origin', 'http://localhost:3000', '--pack', '04', ...publicArgs]));
  assert.throws(() => options(['--origin', 'http://localhost:3000', '--pack', '04', '--allow-localhost']));
  assert.throws(() => options(['--origin', 'http://localhost:3000', '--pack', '04', '--allow-localhost', '--public-context', 'unreviewed-context']));
  assert.equal(options(['--origin', 'http://localhost:3000', '--pack', '04', '--allow-localhost', ...publicArgs]).pack, '04');
  assert.equal(options(['--origin', 'http://localhost:3000', '--pack', '04', '--allow-localhost', ...publicArgs, '--measure-link']).measureLink, true);
  assert.equal(options(['--origin', 'http://localhost:3000', '--pack', '04', '--allow-localhost', ...publicArgs]).measureLink, false);
  assert.equal(safeCacheMetadata(new Headers({ 'cache-control': 'no-cache, no-store', age: '0', 'x-cache': 'Miss from cloudfront', 'set-cookie': 'must-not-appear' })), 'cache-control=no-cache, no-store | age=0 | x-cache=Miss from cloudfront');
  const fixtures = await expectations('04');
  assert.equal(fixtures.length, 4);
  assert.equal(new Set(fixtures.map((fixture) => fixture.headline)).size, 4);
  const sdk = await installedSdkMetadata();
  assert.equal(sdk.analytics.name, '@sitecore-content-sdk/analytics-core');
  assert.equal(sdk.events.name, '@sitecore-content-sdk/events');
  console.log('Offline acceptance-harness checks passed. No network requests made.');
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || (args.length === 1 && ['--help', '-h'].includes(args[0]))) {
    console.log(HELP);
    return 0;
  }
  if (args.length === 1 && args[0] === '--self-test') { await selfTest(); return 0; }
  let config;
  try { config = options(args); }
  catch { console.error('Invalid arguments. No network requests made. Use --help.'); return 2; }
  return config.measureLink ? measureLinks(config) : acceptance(config);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try { process.exitCode = await main(); }
  catch { console.error('Acceptance could not complete. Sensitive error details suppressed.'); process.exitCode = 1; }
}
