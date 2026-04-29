const fs = require('fs');
const requiredFiles = [
  'index.html',
  'style.css',
  'public/css/tokens.css',
  'public/css/base.css',
  'public/css/layout.css',
  'public/css/home.css',
  'public/css/components.css',
  'public/css/responsive.css',
];
for (const file of requiredFiles) {
  if (!fs.existsSync(file)) throw new Error('Missing redesign file: ' + file);
}
const html = fs.readFileSync('index.html', 'utf8');
const tokens = fs.readFileSync('public/css/tokens.css', 'utf8');
const layout = fs.readFileSync('public/css/layout.css', 'utf8');
const home = fs.readFileSync('public/css/home.css', 'utf8');
const body = [html, tokens, layout, home].join('\n');
const required = [
  'data-pm-redesign="premium-mobile-phase1"',
  'pm-premium-category-strip',
  '--pm-premium-bg-0',
  '--pm-premium-yellow',
  '--pm-premium-green',
  '--pm-premium-danger',
  '--pm-premium-radius-lg',
  'mobile-first',
  'bottom-nav-h',
  '#games',
  '#leaderboard',
];
for (const needle of required) {
  if (!body.includes(needle)) throw new Error('Missing redesign contract token: ' + needle);
}
const forbidden = ['--pm-casino-', 'casino sağlayıcı', 'para yatır', 'para çek', 'slot sağlayıcı'];
const lowerBody = body.toLocaleLowerCase('tr');
for (const needle of forbidden) {
  if (lowerBody.includes(needle)) throw new Error('Forbidden unrelated concept found: ' + needle);
}
console.log('check-home-redesign-phase1: PASS');
