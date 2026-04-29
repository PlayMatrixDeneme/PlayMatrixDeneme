import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('.', import.meta.url));
const publicDir = join(rootDir, 'public');
const port = Number(process.env.PORT || 4173);

const MIME_TYPES = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.ico', 'image/x-icon']
]);

function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    "connect-src 'self' https://emirhan-siye.onrender.com https://playmatrix.com.tr https://www.playmatrix.com.tr",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'"
  ].join('; '));
}

function safeResolve(urlPath) {
  const cleanPath = decodeURIComponent(urlPath.split('?')[0]).replace(/^\/+/, '');
  const candidate = normalize(join(publicDir, cleanPath));
  if (!candidate.startsWith(publicDir)) return null;
  return candidate;
}

async function fileExists(path) {
  try {
    const result = await stat(path);
    return result.isFile();
  } catch {
    return false;
  }
}

const server = createServer(async (req, res) => {
  setSecurityHeaders(res);

  if (req.url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, scope: 'homepage-only', timestamp: new Date().toISOString() }));
    return;
  }

  let targetPath = req.url === '/' ? join(publicDir, 'index.html') : safeResolve(req.url || '/');
  if (!targetPath) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Bad request');
    return;
  }

  if (!(await fileExists(targetPath))) {
    targetPath = join(publicDir, 'index.html');
  }

  try {
    const body = await readFile(targetPath);
    const contentType = MIME_TYPES.get(extname(targetPath)) || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(body);
  } catch {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Internal server error');
  }
});

server.listen(port, () => {
  console.log(`PlayMatrix homepage preview running on http://localhost:${port}`);
});
