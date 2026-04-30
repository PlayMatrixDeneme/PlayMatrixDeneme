#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const failures = [];
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function mustContain(rel, needle, label) { if (!read(rel).includes(needle)) failures.push(`${label} eksik: ${rel}`); }
function mustNotExist(rel, label) { if (fs.existsSync(path.join(root, rel))) failures.push(`${label} hâlâ var: ${rel}`); }

if (!fs.existsSync(path.join(root, 'maintenance', 'index.html'))) failures.push('maintenance/index.html yok.');
mustNotExist('Bakim', 'Legacy bakım klasörü');
mustNotExist('Bakım', 'Legacy Türkçe bakım klasörü');
mustContain('server.js', "MAINTENANCE_CANONICAL_PATH = '/maintenance'", 'Canonical maintenance route');
mustContain('server.js', "app.get('/readyz', sendReady)", 'Render readiness endpoint');
mustContain('server.js', "app.get('/api/readyz', sendReady)", 'API readiness endpoint');
mustContain('server.js', 'httpServer.listen(PORT, HOST', 'Render 0.0.0.0 bind');
mustContain('config/constants.js', "const HOST = process.env.HOST || '0.0.0.0'", 'HOST sabiti');
mustContain('.env.example', 'PUBLIC_BASE_PATH=', 'PUBLIC_BASE_PATH env satırı');
if (read('.env.example').includes('playmatrixdeneme.github.io')) failures.push('Deneme origin .env.example içinde bulunmamalı.');
mustContain('utils/env.js', 'normalizePublicBasePath', 'PUBLIC_BASE_PATH normalizer');
mustContain('utils/publicRuntime.js', 'basePath', 'Runtime basePath');
mustContain('public/playmatrix-static-runtime.js', 'detectBasePath', 'Static basePath detector');
mustContain('public/playmatrix-static-runtime.js', 'window.__PM_RESOLVE_PATH__', 'Client path resolver');
mustContain('public/playmatrix-api.js', 'resolvePath', 'API path resolver');

if (failures.length) {
  console.error('Deploy/domain/maintenance kontrolü başarısız:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('check:deploy-env OK');
process.exit(0);
