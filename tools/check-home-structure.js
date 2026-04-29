import { exists, fail, pass } from './lib.js';

const required = [
  'package.json',
  'server.js',
  '.env.example',
  '.nojekyll',
  'index.html',
  '404.html',
  'style.css',
  'script.js',
  'styles/00-tokens.css',
  'styles/01-reset.css',
  'styles/02-layout.css',
  'styles/03-components.css',
  'styles/04-home.css',
  'styles/05-modals.css',
  'styles/06-responsive.css',
  'scripts/app/boot-home.js',
  'scripts/app/render-home.js',
  'scripts/app/events.js',
  'scripts/app/state.js',
  'scripts/app/api-client.js',
  'scripts/data/home-data.js',
  'scripts/components/modal.js',
  'scripts/components/toast.js',
  'scripts/core/dom.js',
  'scripts/core/format.js',
  'scripts/core/guards.js',
  'scripts/sections/hero.js',
  'scripts/sections/metrics.js',
  'scripts/sections/profile.js',
  'scripts/sections/games.js',
  'scripts/sections/leaderboard.js',
  'scripts/sections/rewards.js',
  'scripts/sections/support.js',
  'scripts/sections/social.js',
  'assets/brand/playmatrix-mark.svg',
  'assets/brand/favicon.svg',
  'assets/avatars/default-avatar.svg',
  'assets/ui/noise.svg'
];

const missing = [];
for (const file of required) {
  if (!(await exists(file))) missing.push(file);
}
if (missing.length) fail('GitHub Pages AnaSayfa dosya yapısı eksik.', missing);
pass('GitHub Pages AnaSayfa dosya yapısı doğru.');
