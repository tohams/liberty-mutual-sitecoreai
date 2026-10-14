import https from 'node:https';
import http from 'node:http';

const hopHeaders = ['connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade'];
function cleanHeaders(original) {
  const headers = { ...original };
  const connection = original.connection;
  if (typeof connection === 'string') for (const name of connection.split(',')) delete headers[name.trim().toLowerCase()];
  for (const name of hopHeaders) delete headers[name];
  return headers;
}

/** HTTPS localhost in front of the unchanged Next.js production start command. */
export function createHttpsRelay({ cert, key, httpsPort, appPort, hostname = 'localhost' }) {
  if (hostname !== 'localhost' || ![httpsPort, appPort].every(port => Number.isInteger(port) && port > 0 && port <= 65535) || httpsPort === appPort) {
    throw new Error('The relay requires different localhost ports.');
  }
  const publicOrigin = `https://${hostname}:${httpsPort}`;
  const internalOrigin = `https://${hostname}:${appPort}`;
  const server = https.createServer({ cert, key, minVersion: 'TLSv1.2' }, (request, response) => {
    if (request.headers.host !== `${hostname}:${httpsPort}` || !request.url?.startsWith('/') || request.url.startsWith('//')) {
      response.writeHead(400); response.end('Invalid local host or path'); return;
    }
    const write = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);
    const origin = request.headers.origin;
    if ((write && origin !== publicOrigin) || (origin && origin !== publicOrigin)) {
      response.writeHead(403); response.end('Invalid local origin'); return;
    }
    const headers = cleanHeaders(request.headers);
    // Validate the browser's public origin before translating this loopback hop.
    // Next.js constructs its request URL using the production server's port.
    if (origin) headers.origin = internalOrigin;
    delete headers.forwarded;
    delete headers['x-forwarded-for'];
    for (const name of Object.keys(headers)) {
      if (name.startsWith('x-vercel-ip-') || ['cf-ipcountry', 'cf-region', 'cf-ipcity'].includes(name)) delete headers[name];
    }
    headers.host = `${hostname}:${httpsPort}`;
    headers['x-forwarded-host'] = `${hostname}:${httpsPort}`;
    headers['x-forwarded-proto'] = 'https';
    headers['x-forwarded-port'] = String(httpsPort);
    const upstream = http.request({ hostname, port: appPort, path: request.url, method: request.method, headers }, reply => {
      const responseHeaders = cleanHeaders(reply.headers);
      const location = responseHeaders.location;
      if (typeof location === 'string') {
        for (const scheme of ['https', 'http']) {
          const backendOrigin = `${scheme}://${hostname}:${appPort}`;
          if (location === backendOrigin || location.startsWith(`${backendOrigin}/`) || location.startsWith(`${backendOrigin}?`) || location.startsWith(`${backendOrigin}#`)) {
            responseHeaders.location = publicOrigin + location.slice(backendOrigin.length);
            break;
          }
        }
      }
      response.writeHead(reply.statusCode ?? 502, responseHeaders);
      reply.on('error', () => response.destroy());
      reply.pipe(response);
    });
    upstream.setTimeout(60000, () => upstream.destroy());
    upstream.on('error', () => {
      if (response.destroyed) return;
      if (response.headersSent) { response.destroy(); return; }
      response.writeHead(502); response.end('Local production server unavailable');
    });
    request.on('aborted', () => upstream.destroy());
    request.on('error', () => upstream.destroy());
    response.on('close', () => { if (!response.writableFinished) upstream.destroy(); });
    request.pipe(upstream);
  });
  server.requestTimeout = 60000;
  server.headersTimeout = 10000;
  return server;
}
