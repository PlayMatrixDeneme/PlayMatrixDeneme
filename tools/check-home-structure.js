import { exists, fail, pass } from './lib.js';

const requiredFiles = [
  'package.json',
  'server.js',
  'public/index.html',
  'public/styles/tokens.css',
  'public/styles/base.css',
  'public/styles/layout.css',
  'public/styles/components.css',
  'public/styles/home.css',
  'public/styles/responsive.css',
  'public/scripts/app/main.js',
  'public/scripts/app/render.js',
  'public/scripts/components/modal.js',
  'public/scripts/components/toast.js',
  'public/scripts/data/home-content.js',
  'public/assets/brand/playmatrix-mark.svg',
  'public/assets/brand/favicon.svg',
  'public/assets/avatars/default-avatar.svg',
  'public/assets/ui/noise.svg',
  'docs/DESIGN_SYSTEM.md',
  'docs/HOMEPAGE_SCOPE.md',
  'docs/TESTING.md'
];

const missing = [];
for (const file of requiredFiles) {
  if (!(await exists(file))) missing.push(file);
}

if (missing.length) fail('Zorunlu AnaSayfa dosyaları eksik.', missing);
pass('AnaSayfa dosya yapısı doğru.');
