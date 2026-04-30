#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const checks = [];
const pass = (name, ok, detail = '') => checks.push({ name, ok: !!ok, detail });

const index = read('index.html');
const homeCss = read('public/css/home.css');
const heroJs = read('public/js/home/hero-slider.js');
const catalogJs = read('public/js/home/game-catalog.js');
const renderersJs = read('public/js/home/renderers.js');
const legacyJs = read('public/js/home/legacy-home.runtime.js');

pass('FAZ 5 hero section exists', /<section class="hero home-stage" id="hero"[^>]*data-phase="5"/.test(index));
pass('21:9 hero slider exists', index.includes('id="heroPromoCarousel"') && index.includes('id="heroPromoViewport"') && index.includes('id="heroPromoTrack"'));
pass('Hero has exactly 3 static slides', (index.match(/class="hero-slide /g) || []).length === 3);
pass('Hero dots exist', (index.match(/class="hero-slider-dot/g) || []).length >= 3);
pass('Shortcut grid exists', index.includes('id="homeShortcutGrid"'));
['Crash','Satranç','Pişti','Pattern Master','Space Pro','Snake Pro'].forEach((label) => {
  pass(`Shortcut/card includes ${label}`, index.includes(label));
});
pass('Games section phase 5 exists', /<section class="section home-games-section" id="games"[^>]*data-phase="5"/.test(index));
pass('Game grid has phase 5 class', index.includes('class="games-grid home-games-grid"'));
pass('Game media surface exists', index.includes('class="game-media"'));
pass('Search input preserved', index.includes('id="gameSearch"'));
pass('Filter row preserved', index.includes('id="filterRow"'));
pass('Metric games count preserved', index.includes('id="metricGamesCount"'));
pass('Hero profile compatibility IDs preserved', ['heroProfileAvatarShell','heroProfileName','heroProfileMeta','heroProgressText','heroProgressFill','ui-account-level','ui-monthly-activity'].every((id) => index.includes(`id="${id}"`)));

['/online-games/crash','/online-games/chess','/online-games/pisti','/classic-games/pattern-master','/classic-games/space-pro','/classic-games/snake-pro'].forEach((route) => {
  pass(`Route preserved ${route}`, index.includes(`href="${route}"`) || catalogJs.includes(route) || legacyJs.includes(route));
});

pass('Phase 5 CSS present', homeCss.includes('FAZ 5 — Mobile-first home redesign'));
pass('Shortcut CSS present', homeCss.includes('.home-shortcut-grid'));
pass('Game media CSS present', homeCss.includes('.game-media'));
pass('Mobile carousel CSS present', homeCss.includes('scroll-snap-type:x mandatory'));
pass('Reduced motion CSS present', homeCss.includes('@media (prefers-reduced-motion: reduce)'));

pass('Hero slider JS marks phase 5', heroJs.includes('dataset.phase = "5"'));
pass('Game catalog classic free tags', ['patternmaster','spacepro','snakepro'].every((key) => {
  const re = new RegExp(`key: "${key}"[\\s\\S]*?access: "free"`);
  return re.test(catalogJs);
}));
pass('Renderer exposes phase 5 game card factory', renderersJs.includes('createHomeGameCard'));
pass('Legacy dynamic cards include game media', legacyJs.includes("gameMedia.className = 'game-media'"));
pass('Legacy carousel no gold theme', !legacyJs.includes("theme: 'gold'"));

const forbiddenIndexTerms = ['Para Yatır', 'Para Çek', 'Bahis Geçmişi', 'Canlı Casino', 'Slotlar'];
for (const term of forbiddenIndexTerms) {
  pass(`Forbidden home term absent: ${term}`, !index.includes(term));
}

const failed = checks.filter((check) => !check.ok);
for (const check of checks) {
  console.log(`${check.ok ? '✓' : '✗'} ${check.name}${check.detail ? ` — ${check.detail}` : ''}`);
}
if (failed.length) {
  console.error(`\nFAZ 5 kalite kapısı başarısız: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log(`\nFAZ 5 kalite kapısı başarılı: ${checks.length}/${checks.length}`);
