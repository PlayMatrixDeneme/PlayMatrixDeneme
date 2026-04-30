'use strict';

const fs = require('fs');
const path = require('path');
const root = process.cwd();
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function fail(message) { console.error(`[check:phase9] ${message}`); process.exit(1); }
function assert(cond, message) { if (!cond) fail(message); }

const constants = read('config/constants.js');
const chatRoutes = read('routes/chat.routes.js');
const sockets = read('sockets/index.js');
const socialRoutes = read('routes/social.routes.js');
const crons = read('crons/tasks.js');
const realtime = read('utils/realtimeState.js');
const socialEvents = read('utils/socialEvents.js');
const chatSearch = read('utils/chatSearchIndex.js');
const pkg = JSON.parse(read('package.json'));

assert(/LOBBY_CHAT_RETENTION_DAYS\s*=\s*Math\.max\(1,\s*Number\(process\.env\.LOBBY_CHAT_RETENTION_DAYS \|\| 7\)\)/.test(constants), 'Global chat retention default 7 gün olmalı.');
assert(/DIRECT_CHAT_RETENTION_DAYS\s*=\s*Math\.max\(1,\s*Number\(process\.env\.DIRECT_CHAT_RETENTION_DAYS \|\| 14\)\)/.test(constants), 'DM retention default 14 gün olmalı.');
assert(/DIRECT_MESSAGE_EDIT_WINDOW_HOURS\s*=\s*Math\.max\(1,\s*Number\(process\.env\.DIRECT_MESSAGE_EDIT_WINDOW_HOURS \|\| 24\)\)/.test(constants), 'DM edit window default 24 saat olmalı.');
assert(chatRoutes.includes('queryDirectMessageSearchIndex'), 'DM search indeksli query kullanmalı.');
assert(chatRoutes.includes('legacyDirectMessageSearch'), 'DM search eski mesajlar için bounded backfill fallback içermeli.');
assert(chatRoutes.includes('indexBackfillQueued'), 'DM history index backfill kuyruğu oluşturmalı.');
assert(chatRoutes.includes("collection: 'users/{uid}/chat_message_index'"), 'DM search endpoint index kontratını döndürmeli.');
assert(chatRoutes.includes('upsertDirectMessageSearchIndex'), 'DM edit search indeksini güncellemeli.');
assert(chatRoutes.includes('deleteDirectMessageSearchIndex'), 'DM delete search indeksini temizlemeli.');
assert(sockets.includes('upsertDirectMessageSearchIndex'), 'Socket DM send search indeksine yazmalı.');
assert(crons.includes('deleteDirectMessageSearchIndex'), 'Retention cleanup search indeksini temizlemeli.');
assert(chatSearch.includes('SEARCH_INDEX_COLLECTION') && chatSearch.includes('chat_message_index'), 'chatSearchIndex helper eksik.');
assert(chatSearch.includes("collection(SEARCH_INDEX_COLLECTION)") && chatSearch.includes("where('terms', 'array-contains'"), 'Search indeks subcollection + term query kullanmalı.');
assert(socialEvents.includes('SOCIAL_EVENT_TYPES') && socialEvents.includes('emitSocialEvent'), 'Merkezi social event helper eksik.');
assert(sockets.includes("emitSocialEvent(io, [], SOCIAL_EVENT_TYPES.PRESENCE_UPDATED"), 'Presence social:event üzerinden de yayınlanmalı.');
assert(sockets.includes("['ONLINE', 'VISIBLE', 'ACTIVE']") && sockets.includes("['INGAME', 'PLAYING', 'PLAYING_GAME', 'IN_GAME']"), 'Socket presence online/ingame aliaslarını normalize etmeli.');
assert(sockets.includes('userPresence[uid]?.disconnectTimer') && sockets.includes('reconnect: true'), 'Reconnect sırasında eski disconnectTimer temizlenmeli.');
assert(sockets.includes("raw.includes('crash')") && realtime.includes("raw.includes('crash')"), 'Presence gameType crash desteği eksik.');
assert(sockets.includes('SOCIAL_EVENT_TYPES.GAME_INVITE_CREATED') && sockets.includes('SOCIAL_EVENT_TYPES.GAME_INVITE_ACCEPTED'), 'Oyun daveti merkezi social event sistemine bağlı olmalı.');
assert(socialRoutes.includes('SOCIAL_EVENT_TYPES.FRIEND_REQUEST_CREATED') && socialRoutes.includes('SOCIAL_EVENT_TYPES.FRIEND_REMOVED'), 'Arkadaşlık akışı merkezi social event sistemine bağlı olmalı.');
assert(pkg.scripts && pkg.scripts['check:phase9'] === 'node tools/check-social-realtime.js', 'package.json check:phase9 scripti eksik.');
console.log('[check:phase9] OK - retention, DM search index, socket presence, arkadaşlık ve oyun daveti tek social:event kontratına bağlı.');

process.exit(0);
