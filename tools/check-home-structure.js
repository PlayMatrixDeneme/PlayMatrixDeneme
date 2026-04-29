import { exists, fail, pass } from './lib.js';

const required = [
  'package.json',
  'server.js',
  '.env.example',
  'public/index.html',
  'public/style.css',
  'public/script.js',
  'public/styles/00-tokens.css',
  'public/styles/01-reset.css',
  'public/styles/02-layout.css',
  'public/styles/03-components.css',
  'public/styles/04-home.css',
  'public/styles/05-modals.css',
  'public/styles/06-responsive.css',
  'public/scripts/app/boot-home.js',
  'public/scripts/app/render-home.js',
  'public/scripts/app/events.js',
  'public/scripts/app/state.js',
  'public/scripts/app/api-client.js',
  'public/scripts/data/home-data.js',
  'public/scripts/components/modal.js',
  'public/scripts/components/toast.js',
  'public/scripts/core/dom.js',
  'public/scripts/core/format.js',
  'public/scripts/core/guards.js',
  'public/scripts/sections/hero.js',
  'public/scripts/sections/metrics.js',
  'public/scripts/sections/profile.js',
  'public/scripts/sections/games.js',
  'public/scripts/sections/leaderboard.js',
  'public/scripts/sections/rewards.js',
  'public/scripts/sections/support.js',
  'public/scripts/sections/social.js',
  'public/assets/brand/playmatrix-mark.svg',
  'public/assets/brand/favicon.svg',
  'public/assets/avatars/default-avatar.svg',
  'public/assets/ui/noise.svg'
];

const missing = [];
for (const file of required) {
  if (!(await exists(file))) missing.push(file);
}
if (missing.length) fail('AnaSayfa dosya yapısı eksik.', missing);
pass('AnaSayfa dosya yapısı doğru.');
