#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const failures = [];
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const must = (condition, message) => { if (!condition) failures.push(message); };
const mustContain = (rel, needle, label) => must(read(rel).includes(needle), `${label} eksik: ${rel}`);
const mustMatch = (rel, regex, label) => must(regex.test(read(rel)), `${label} pattern eksik: ${rel}`);

const chatRoutes = read('routes/chat.routes.js');
const chatSearch = read('utils/chatSearchIndex.js');
const sockets = read('sockets/index.js');
const socialRoutes = read('routes/social.routes.js');
const crons = read('crons/tasks.js');
const pkg = JSON.parse(read('package.json'));

mustContain('routes/chat.routes.js', 'const revalidatedItems = (await Promise.all', 'DM search live-message revalidation layer');
mustContain('routes/chat.routes.js', "if (lifecycle.deleted || status === 'deleted' || !text) return;", 'DM search deleted/tombstone filter');
mustContain('routes/chat.routes.js', 'deleteDirectMessageSearchIndex({ chatId, messageId', 'Stale DM search index cleanup');
mustContain('routes/chat.routes.js', "revalidated: true", 'DM search revalidation response contract');
mustContain('routes/chat.routes.js', 'indexBackfillQueued', 'DM history index backfill marker');
mustContain('utils/chatSearchIndex.js', 'SEARCH_INDEX_COLLECTION', 'DM search index helper');
mustContain('utils/chatSearchIndex.js', "collection(SEARCH_INDEX_COLLECTION)", 'DM search index subcollection');
mustContain('utils/chatSearchIndex.js', "where('terms', 'array-contains'", 'DM search term query');
mustContain('crons/tasks.js', "colJobs().doc('chat_retention_cleanup')", 'Chat retention cleanup report');
mustContain('crons/tasks.js', 'deleteDirectMessageSearchIndex', 'Retention index cleanup');
mustContain('crons/tasks.js', "collectionGroup('messages')", 'Message-age-based DM retention');
mustContain('sockets/index.js', 'findPendingInviteBetweenUsers', 'Invite idempotency guard');
mustContain('sockets/index.js', "inviteConflict.kind === 'reuse'", 'Invite reuse guard');
mustContain('sockets/index.js', "inviteConflict.kind === 'block'", 'Invite duplicate block guard');
mustContain('sockets/index.js', 'safeNum(invite.expiresAt, 0) <= nowMs()', 'Invite TTL server-side response enforcement');
mustContain('sockets/index.js', 'expiresAt: invite.expiresAt', 'Invite lifecycle expiry payload');
mustContain('sockets/index.js', "emitSocialEvent(io, [], SOCIAL_EVENT_TYPES.PRESENCE_UPDATED", 'Presence central social event');
mustContain('sockets/index.js', 'userPresence[uid]?.disconnectTimer', 'Presence reconnect timer cleanup');
mustContain('sockets/index.js', 'reconnect: true', 'Presence reconnect marker');
mustContain('sockets/index.js', 'socket.on(\'pm:pong\'', 'Presence heartbeat pong listener');
mustContain('sockets/index.js', 'touchUserActivity(uid, { scope: \'socket_pong\'', 'Presence heartbeat activity touch');
mustContain('routes/social.routes.js', "if (existing.status === 'accepted')", 'Friend duplicate accepted guard');
mustContain('routes/social.routes.js', "if (existing.requesterUid === uid && existing.status === 'pending')", 'Friend duplicate pending guard');
mustContain('routes/social.routes.js', "SOCIAL_EVENT_TYPES.FRIEND_REQUEST_CREATED", 'Friend request created social event');
mustContain('routes/social.routes.js', "SOCIAL_EVENT_TYPES.FRIEND_REMOVED", 'Friend removed social event');
must(pkg.scripts && pkg.scripts['check:phase4'] === 'node tools/check-release-readiness.js --phase=4', 'package.json check:phase4 scripti eksik veya hatalı.');
must(pkg.scripts && pkg.scripts['check:phase4-social'] === 'node tools/check-social-integrity.js', 'package.json check:phase4-social scripti eksik veya hatalı.');

// Negative assurance: search results must not be returned directly from stale index path.
must(!/const items = \(mergedItems \|\| \[\]\)\.map/.test(chatRoutes), 'DM search stale mergedItems doğrudan response edilmemeli.');

if (failures.length) {
  console.error('Social integrity kontrolü başarısız:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('check:phase4-social OK. Chat/DM search revalidation, retention cleanup, invite idempotency, friend duplicate guard ve presence lifecycle doğrulandı.');
process.exit(0);
