'use strict';

const GAME_ROUTE_MAP = Object.freeze([
  {
    id: 'crash',
    title: 'Crash',
    file: 'online-games/crash.html',
    canonical: '/online-games/crash',
    requiresAuth: true,
    aliases: [
      '/online-games/crash.html',
      '/Online Oyunlar/Crash',
      '/Online Oyunlar/Crash.html',
      '/Online%20Oyunlar/Crash',
      '/Online%20Oyunlar/Crash.html',
      '/Crash.html',
      '/crash'
    ]
  },
  {
    id: 'pisti',
    title: 'Pişti',
    file: 'online-games/pisti.html',
    canonical: '/online-games/pisti',
    requiresAuth: true,
    aliases: [
      '/online-games/pisti.html',
      '/Online Oyunlar/Pisti',
      '/Online Oyunlar/Pisti.html',
      '/Online%20Oyunlar/Pisti',
      '/Online%20Oyunlar/Pisti.html',
      '/OnlinePisti.html',
      '/Pisti.html',
      '/pisti'
    ]
  },
  {
    id: 'chess',
    title: 'Satranç',
    file: 'online-games/satranc.html',
    canonical: '/online-games/chess',
    requiresAuth: true,
    aliases: [
      '/online-games/chess.html',
      '/online-games/satranc',
      '/online-games/satranc.html',
      '/Online Oyunlar/Satranc',
      '/Online Oyunlar/Satranc.html',
      '/Online%20Oyunlar/Satranc',
      '/Online%20Oyunlar/Satranc.html',
      '/Satranc.html',
      '/satranc'
    ]
  },
  {
    id: 'snake-pro',
    title: 'Snake Pro',
    file: 'classic-games/snake-pro.html',
    canonical: '/classic-games/snake-pro',
    requiresAuth: true,
    aliases: [
      '/classic-games/snake-pro.html',
      '/classic-games/SnakePro',
      '/classic-games/SnakePro.html',
      '/Klasik Oyunlar/SnakePro',
      '/Klasik Oyunlar/SnakePro.html',
      '/Klasik%20Oyunlar/SnakePro',
      '/Klasik%20Oyunlar/SnakePro.html'
    ]
  },
  {
    id: 'pattern-master',
    title: 'Pattern Master',
    file: 'classic-games/pattern-master.html',
    canonical: '/classic-games/pattern-master',
    requiresAuth: true,
    aliases: [
      '/classic-games/pattern-master.html',
      '/classic-games/PatternMaster',
      '/classic-games/PatternMaster.html',
      '/Klasik Oyunlar/PatternMaster',
      '/Klasik Oyunlar/PatternMaster.html',
      '/Klasik%20Oyunlar/PatternMaster',
      '/Klasik%20Oyunlar/PatternMaster.html'
    ]
  },
  {
    id: 'space-pro',
    title: 'Space Pro',
    file: 'classic-games/space-pro.html',
    canonical: '/classic-games/space-pro',
    requiresAuth: true,
    aliases: [
      '/classic-games/space-pro.html',
      '/classic-games/SpacePro',
      '/classic-games/SpacePro.html',
      '/Klasik Oyunlar/SpacePro',
      '/Klasik Oyunlar/SpacePro.html',
      '/Klasik%20Oyunlar/SpacePro',
      '/Klasik%20Oyunlar/SpacePro.html'
    ]
  }
]);

const STATIC_DIR_ALIASES = Object.freeze([
  { publicPath: '/online-games', dir: 'online-games' },
  { publicPath: '/classic-games', dir: 'classic-games' },
  { publicPath: '/frames', dir: 'frames' },
  { publicPath: '/maintenance', dir: 'maintenance' },
  { publicPath: '/Online Oyunlar', dir: 'online-games', legacy: true },
  { publicPath: '/Klasik Oyunlar', dir: 'classic-games', legacy: true },
  { publicPath: '/Cerceve', dir: 'frames', legacy: true },
  { publicPath: '/Çerçeve', dir: 'frames', legacy: true },
  { publicPath: '/Bakim', dir: 'maintenance', legacy: true },
  { publicPath: '/Bakım', dir: 'maintenance', legacy: true }
]);

const LEGACY_ASSET_ALIASES = Object.freeze([
  ['/Online Oyunlar/Pisti.phase4-1.css', 'online-games/pisti.css'],
  ['/Online Oyunlar/Pisti.phase4-module-1.js', 'online-games/pisti.js'],
  ['/Online Oyunlar/Pisti.phase4-script-1.js', 'online-games/route-lock.js'],
  ['/Online Oyunlar/Satranc.phase4-1.css', 'online-games/chess.css'],
  ['/Online Oyunlar/Satranc.phase4-module-1.js', 'online-games/chess.js'],
  ['/Online Oyunlar/Satranc.phase4-script-1.js', 'online-games/chess-route-lock.js'],
  ['/Klasik Oyunlar/PatternMaster.phase4-1.css', 'classic-games/pattern-master.css'],
  ['/Klasik Oyunlar/PatternMaster.phase4-script-1.js', 'classic-games/route-lock.js'],
  ['/Klasik Oyunlar/PatternMaster.phase4-script-2.js', 'classic-games/touch-guard.js'],
  ['/Klasik Oyunlar/PatternMaster.phase4-script-3.js', 'classic-games/pattern-master.js'],
  ['/Klasik Oyunlar/SnakePro.phase4-1.css', 'classic-games/snake-pro.css'],
  ['/Klasik Oyunlar/SnakePro.phase4-script-1.js', 'classic-games/snake-route-lock.js'],
  ['/Klasik Oyunlar/SnakePro.phase4-script-2.js', 'classic-games/snake-touch-guard.js'],
  ['/Klasik Oyunlar/SnakePro.phase4-script-3.js', 'classic-games/snake-pro.js'],
  ['/Klasik Oyunlar/SpacePro.phase4-1.css', 'classic-games/space-pro.css'],
  ['/Klasik Oyunlar/SpacePro.phase4-script-1.js', 'classic-games/space-route-lock.js'],
  ['/Klasik Oyunlar/SpacePro.phase4-script-2.js', 'classic-games/space-touch-guard.js'],
  ['/Klasik Oyunlar/SpacePro.phase4-script-3.js', 'classic-games/space-pro.js'],
  ['/public/css/phase4-inline.css', 'public/css/static-inline.css'],
  ['/public/js/phase4/static-actions.js', 'public/js/static-actions.js'],
  ['/index.phase4-script-1.js', 'index-boot.js'],
  ['/Bakim/index.phase4-1.css', 'maintenance/maintenance.css'],
  ['/Bakim/index.phase4-script-1.js', 'maintenance/maintenance.js']
]);

module.exports = {
  GAME_ROUTE_MAP,
  STATIC_DIR_ALIASES,
  LEGACY_ASSET_ALIASES
};
