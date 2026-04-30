'use strict';

const crypto = require('crypto');
const { cleanStr, safeNum, nowMs } = require('./helpers');
const { recordAuditLog } = require('./logger');
const { resolveAdminContext, hasAdminPermission } = require('../middlewares/admin.middleware');

const SUPPORT_TICKET_STATUSES = Object.freeze(['open', 'waiting_user', 'waiting_admin', 'resolved', 'closed']);
const SUPPORT_TICKET_CATEGORIES = Object.freeze(['general', 'payment', 'game', 'account', 'bug', 'reward', 'moderation']);
const SUPPORT_TICKET_PRIORITIES = Object.freeze(['low', 'normal', 'high', 'critical']);

function normalizeTicketId(value = '') {
  return cleanStr(value || '', 160).replace(/[^a-zA-Z0-9_:-]/g, '').slice(0, 160);
}

function sanitizeSupportText(value = '', maxLen = 3000) {
  return cleanStr(value || '', maxLen)
    .replace(/[\u202A-\u202E\u2066-\u2069]/g, '')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function normalizeSupportStatus(value = '', fallback = 'open') {
  const normalized = cleanStr(value || fallback, 24).toLowerCase();
  return SUPPORT_TICKET_STATUSES.includes(normalized) ? normalized : fallback;
}

function normalizeSupportPriority(value = '') {
  const normalized = cleanStr(value || 'normal', 16).toLowerCase();
  return SUPPORT_TICKET_PRIORITIES.includes(normalized) ? normalized : 'normal';
}

function normalizeSupportCategory(value = '') {
  const normalized = cleanStr(value || 'general', 32).toLowerCase();
  return SUPPORT_TICKET_CATEGORIES.includes(normalized) ? normalized : 'general';
}

function buildSupportMessage({ sender = 'user', senderUid = '', text = '', createdAt = nowMs(), id = '' } = {}) {
  const safeSender = cleanStr(sender || 'user', 16).toLowerCase() === 'admin' ? 'admin' : 'user';
  const safeText = sanitizeSupportText(text, 3000);
  if (!safeText) {
    const error = new Error('Mesaj metni boş olamaz.');
    error.statusCode = 400;
    throw error;
  }
  return {
    id: normalizeTicketId(id) || crypto.randomUUID(),
    sender: safeSender,
    senderUid: cleanStr(senderUid || '', 160),
    text: safeText,
    createdAt: safeNum(createdAt, nowMs())
  };
}

function isTicketOwner(ticket = {}, uid = '') {
  return !!uid && cleanStr(ticket?.uid || '', 160) === cleanStr(uid || '', 160);
}

async function canAdminAccessSupport(user = {}, action = 'read') {
  const context = await resolveAdminContext(user || {});
  const permission = action === 'write' ? 'tickets.write' : 'tickets.read';
  return !!context?.isAdmin && hasAdminPermission(context, permission);
}

async function assertTicketAccess({ ticket = {}, user = {}, action = 'read', allowAdmin = false } = {}) {
  const uid = cleanStr(user?.uid || '', 160);
  if (isTicketOwner(ticket, uid)) return { role: 'owner', uid };
  if (allowAdmin && await canAdminAccessSupport(user, action)) return { role: 'admin', uid };
  const error = new Error('Bu destek kaydına erişim yetkiniz yok.');
  error.statusCode = 403;
  error.code = 'SUPPORT_TICKET_OWNERSHIP_REQUIRED';
  throw error;
}

function formatTicketSnapshot(docOrData, requesterUid = '') {
  const isDoc = docOrData && typeof docOrData.data === 'function';
  const data = isDoc ? (docOrData.data() || {}) : (docOrData || {});
  const id = isDoc ? docOrData.id : normalizeTicketId(data.id || '');
  const messages = Array.isArray(data.messages) ? data.messages : [];
  return {
    id,
    uid: cleanStr(data.uid || '', 160),
    email: cleanStr(data.email || '', 200),
    subject: sanitizeSupportText(data.subject || 'Destek Talebi', 120) || 'Destek Talebi',
    category: normalizeSupportCategory(data.category),
    priority: normalizeSupportPriority(data.priority),
    status: normalizeSupportStatus(data.status),
    createdAt: safeNum(data.createdAt, 0),
    updatedAt: safeNum(data.updatedAt, 0),
    lastReplyAt: safeNum(data.lastReplyAt, 0),
    unreadForUser: !!data.unreadForUser,
    unreadForAdmin: !!data.unreadForAdmin,
    messages: messages.slice(-50).map((message) => ({
      id: normalizeTicketId(message?.id || '') || crypto.randomUUID(),
      sender: cleanStr(message?.sender || 'user', 16) || 'user',
      senderUid: cleanStr(message?.senderUid || '', 160),
      text: sanitizeSupportText(message?.text || '', 3000),
      createdAt: safeNum(message?.createdAt, 0)
    })),
    canReply: requesterUid ? isTicketOwner(data, requesterUid) : false
  };
}

async function recordSupportEvent({ actorUid = '', actorEmail = '', action = '', ticketId = '', status = 'success', metadata = {} } = {}) {
  return recordAuditLog({
    actorUid: cleanStr(actorUid || '', 160),
    actorEmail: cleanStr(actorEmail || '', 200),
    action: cleanStr(action || 'support.ticket.event', 120),
    targetType: 'support_ticket',
    targetId: normalizeTicketId(ticketId || ''),
    status: cleanStr(status || 'success', 24),
    metadata: metadata && typeof metadata === 'object' ? metadata : {}
  });
}

module.exports = {
  SUPPORT_TICKET_STATUSES,
  SUPPORT_TICKET_CATEGORIES,
  SUPPORT_TICKET_PRIORITIES,
  normalizeTicketId,
  sanitizeSupportText,
  normalizeSupportStatus,
  normalizeSupportPriority,
  normalizeSupportCategory,
  buildSupportMessage,
  isTicketOwner,
  canAdminAccessSupport,
  assertTicketAccess,
  formatTicketSnapshot,
  recordSupportEvent
};
