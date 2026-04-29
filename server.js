import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('./public', import.meta.url));
const port = Number(process.env.PORT || 4173);
const allowedOrigins = String(process.env.ALLOWED_ORIGINS || 'https://playmatrix.com.tr,https://www.playmatrix.com.tr,https://playmatrixdeneme.github.io')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const types = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml; charset=utf-8'],
  ['.png', 'image/png'],
  ['.ico', 'image/x-icon'],
  ['.webp', 'image/webp']
]);

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(payload)
  });
  res.end(payload);
}

function setSecurityHeaders(req, res) {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
}

function resolvePublicPath(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0] || '/');
  const target = clean === '/' ? '/index.html' : clean;
  const safe = normalize(target).replace(/^([/\\])+/, '');
  const absolute = join(root, safe);
  if (!absolute.startsWith(root)) return null;
  return absolute;
}

const server = createServer(async (req, res) => {
  setSecurityHeaders(req, res);
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Methods': 'GET,HEAD,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization'
    });
    res.end();
    return;
  }
  if (req.url === '/healthz') {
    sendJson(res, 200, { ok: true, scope: 'homepage-only', version: '2.1.0-homepage-rebuild' });
    return;
  }
  if (req.url === '/api/home/bootstrap') {
    sendJson(res, 200, {
      ok: true,
      user: { name: 'Matrix Oyuncusu', level: 24, progress: 72, balance: 50000, frame: 8 },
      source: 'local-preview'
    });
    return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendJson(res, 405, { ok: false, error: 'method_not_allowed' });
    return;
  }

  const absolute = resolvePublicPath(req.url || '/');
  if (!absolute) {
    sendJson(res, 400, { ok: false, error: 'invalid_path' });
    return;
  }

  try {
    const fileStat = await stat(absolute);
    if (!fileStat.isFile()) throw new Error('not_file');
    const contentType = types.get(extname(absolute).toLowerCase()) || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': contentType.includes('text/html') ? 'no-store' : 'public, max-age=3600, immutable'
    });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    createReadStream(absolute).pipe(res);
  } catch {
    const fallback = join(root, 'index.html');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    if (req.method === 'HEAD') res.end();
    else createReadStream(fallback).pipe(res);
  }
});

server.listen(port, () => {
  console.log(`PlayMatrix AnaSayfa preview: http://localhost:${port}`);
});
