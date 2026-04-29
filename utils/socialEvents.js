'use strict';

const { cleanStr, safeNum, nowMs } = require('./helpers');

const SOCIAL_EVENT_TYPES = Object.freeze({
  PRESENCE_UPDATED: 'presence.updated',
  FRIEND_REQUEST_CREATED: 'friends.request.created',
  FRIEND_REQUEST_ACCEPTED: 'friends.request.accepted',
  FRIEND_REQUEST_DECLINED: 'friends.request.declined',
  FRIEND_REMOVED: 'friends.removed',
  GAME_INVITE_CREATED: 'game.invite.created',
  GAME_INVITE_ACCEPTED: 'game.invite.accepted',
  GAME_INVITE_DECLINED: 'game.invite.declined',
  GAME_INVITE_EXPIRED: 'game.invite.expired',
  CHAT_DM_CREATED: 'chat.dm.created',
  CHAT_DM_EDITED: 'chat.dm.edited',
  CHAT_DM_DELETED: 'chat.dm.deleted',
  CHAT_GLOBAL_CREATED: 'chat.global.created'
});

function normalizeTargetUids(targetUids = []) {
  const list = Array.isArray(targetUids) ? targetUids : [targetUids];
  return Array.from(new Set(list.map((uid) => cleanStr(uid || '', 160)).filter(Boolean)));
}

function buildSocialEvent(type = '', payload = {}, options = {}) {
  const safeType = cleanStr(type || '', 80);
  const createdAt = safeNum(options.createdAt, nowMs());
  return {
    eventId: cleanStr(options.eventId || `${safeType}:${createdAt}:${Math.random().toString(36).slice(2, 10)}`, 180),
    type: safeType,
    schemaVersion: 1,
    createdAt,
    actorUid: cleanStr(options.actorUid || payload.actorUid || payload.uid || payload.fromUid || '', 160),
    targetUid: cleanStr(options.targetUid || payload.targetUid || payload.toUid || '', 160),
    payload: payload && typeof payload === 'object' ? payload : {}
  };
}

function emitSocialEvent(io, targetUids = [], type = '', payload = {}, options = {}) {
  if (!io || !type) return null;
  const targets = normalizeTargetUids(targetUids);
  const envelope = buildSocialEvent(type, payload, options);
  const legacyEvents = Array.isArray(options.legacyEvents) ? options.legacyEvents : [];

  if (targets.length) {
    targets.forEach((uid) => {
      io.to(`user_${uid}`).emit('social:event', envelope);
      legacyEvents.forEach((legacy) => {
        if (!legacy?.name) return;
        const legacyPayload = typeof legacy.payload === 'function' ? legacy.payload(uid, envelope) : (legacy.payload || payload);
        io.to(`user_${uid}`).emit(legacy.name, legacyPayload);
      });
    });
  } else {
    io.emit('social:event', envelope);
    legacyEvents.forEach((legacy) => {
      if (!legacy?.name) return;
      io.emit(legacy.name, legacy.payload || payload);
    });
  }

  return envelope;
}

module.exports = {
  SOCIAL_EVENT_TYPES,
  buildSocialEvent,
  emitSocialEvent,
  normalizeTargetUids
};
