'use strict';

const express = require('express');

const { db } = require('../config/firebase');
const { verifyAuth } = require('../middlewares/auth.middleware');
const { supportLimiter } = require('../middlewares/rateLimiters');
const { cleanStr, nowMs } = require('../utils/helpers');
const {
  SUPPORT_TICKET_STATUSES,
  SUPPORT_TICKET_CATEGORIES,
  SUPPORT_TICKET_PRIORITIES,
  normalizeTicketId,
  sanitizeSupportText,
  normalizeSupportPriority,
  normalizeSupportCategory,
  buildSupportMessage,
  assertTicketAccess,
  formatTicketSnapshot,
  recordSupportEvent
} = require('../utils/supportSecurity');

const router = express.Router();
const colTickets = () => db.collection('support_tickets');

router.get('/support/meta', verifyAuth, (_req, res) => {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.json({
    ok: true,
    categories: SUPPORT_TICKET_CATEGORIES,
    priorities: SUPPORT_TICKET_PRIORITIES,
    statuses: SUPPORT_TICKET_STATUSES
  });
});

router.post('/support/tickets', verifyAuth, supportLimiter, async (req, res) => {
  try {
    const uid = cleanStr(req.user.uid || '', 160);
    const subject = sanitizeSupportText(req.body?.subject || '', 120);
    const text = sanitizeSupportText(req.body?.message || req.body?.text || '', 3000);
    const category = normalizeSupportCategory(req.body?.category);
    const priority = normalizeSupportPriority(req.body?.priority);

    if (!uid) throw new Error('Kimlik doğrulama gerekli.');
    if (!subject || subject.length < 4) throw new Error('Konu en az 4 karakter olmalı.');
    if (!text || text.length < 8) throw new Error('Mesaj en az 8 karakter olmalı.');

    const now = nowMs();
    const ticketRef = colTickets().doc();
    const message = buildSupportMessage({ sender: 'user', senderUid: uid, text, createdAt: now });

    await ticketRef.set({
      uid,
      email: cleanStr(req.user.email || '', 200),
      subject,
      category,
      priority,
      status: 'open',
      createdAt: now,
      updatedAt: now,
      lastReplyAt: now,
      unreadForUser: false,
      unreadForAdmin: true,
      messages: [message]
    });

    await recordSupportEvent({
      actorUid: uid,
      actorEmail: req.user.email || '',
      action: 'support.ticket.create',
      ticketId: ticketRef.id,
      metadata: { category, priority }
    });

    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.json({ ok: true, ticket: { id: ticketRef.id, subject, category, priority, status: 'open', createdAt: now, updatedAt: now, messages: [message] } });
  } catch (error) {
    res.status(error.statusCode || 400).json({ ok: false, error: error.message || 'Destek talebi oluşturulamadı.' });
  }
});

router.get('/support/tickets', verifyAuth, async (req, res) => {
  try {
    const snap = await colTickets().where('uid', '==', req.user.uid).orderBy('updatedAt', 'desc').limit(50).get();
    const tickets = snap.docs.map((doc) => formatTicketSnapshot(doc, req.user.uid));
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.json({ ok: true, tickets });
  } catch (_error) {
    res.status(500).json({ ok: false, error: 'Destek kayıtları yüklenemedi.' });
  }
});

router.get('/support/tickets/:id', verifyAuth, async (req, res) => {
  try {
    const ticketId = normalizeTicketId(req.params.id || '');
    if (!ticketId) throw new Error('Geçersiz kayıt.');
    const ticketRef = colTickets().doc(ticketId);
    const snap = await ticketRef.get();
    if (!snap.exists) throw new Error('Destek kaydı bulunamadı.');
    const data = snap.data() || {};
    await assertTicketAccess({ ticket: data, user: req.user, action: 'read', allowAdmin: false });
    const ticket = formatTicketSnapshot(snap, req.user.uid);

    await ticketRef.set({ unreadForUser: false, lastUserReadAt: nowMs() }, { merge: true });
    await recordSupportEvent({
      actorUid: req.user.uid,
      actorEmail: req.user.email || '',
      action: 'support.ticket.read_user',
      ticketId,
      metadata: { ownerUid: cleanStr(data.uid || '', 160) }
    });

    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.json({ ok: true, ticket: { ...ticket, unreadForUser: false } });
  } catch (error) {
    res.status(error.statusCode || 400).json({ ok: false, code: error.code || undefined, error: error.message || 'Destek kaydı yüklenemedi.' });
  }
});

router.post('/support/tickets/:id/reply', verifyAuth, supportLimiter, async (req, res) => {
  try {
    const ticketId = normalizeTicketId(req.params.id || '');
    const text = sanitizeSupportText(req.body?.message || req.body?.text || '', 3000);
    if (!ticketId || !text) throw new Error('Yanıt bilgisi eksik.');

    const ticketRef = colTickets().doc(ticketId);
    const now = nowMs();
    const message = buildSupportMessage({ sender: 'user', senderUid: req.user.uid, text, createdAt: now });

    const ticket = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ticketRef);
      if (!snap.exists) throw new Error('Destek kaydı bulunamadı.');
      const data = snap.data() || {};
      await assertTicketAccess({ ticket: data, user: req.user, action: 'write', allowAdmin: false });
      const messages = Array.isArray(data.messages) ? data.messages.slice(-99) : [];
      messages.push(message);
      const status = 'waiting_admin';
      const patch = { messages, status, unreadForAdmin: true, unreadForUser: false, updatedAt: now, lastReplyAt: now };
      tx.set(ticketRef, patch, { merge: true });
      return formatTicketSnapshot({ id: ticketId, ...data, ...patch }, req.user.uid);
    });

    await recordSupportEvent({
      actorUid: req.user.uid,
      actorEmail: req.user.email || '',
      action: 'support.ticket.reply_user',
      ticketId,
      metadata: { messageLength: text.length }
    });

    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.json({ ok: true, ticket });
  } catch (error) {
    res.status(error.statusCode || 400).json({ ok: false, code: error.code || undefined, error: error.message || 'Yanıt eklenemedi.' });
  }
});

module.exports = router;
