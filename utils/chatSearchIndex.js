'use strict';

const { db, admin } = require('../config/firebase');
const { cleanStr, safeNum, sha256Hex, nowMs } = require('./helpers');

const SEARCH_INDEX_COLLECTION = 'chat_message_index';
const SEARCH_INDEX_SCHEMA_VERSION = 1;
const MAX_TERMS = 48;
const MAX_TEXT_LENGTH = 280;

function normalizeSearchText(value = '') {
  return cleanStr(value || '', MAX_TEXT_LENGTH)
    .toLocaleLowerCase('tr-TR')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeSearchText(value = '') {
  const normalized = normalizeSearchText(value);
  if (!normalized) return [];
  const terms = new Set();
  normalized.split(' ').filter(Boolean).forEach((word) => {
    if (word.length < 2) return;
    const capped = word.slice(0, 24);
    terms.add(capped);
    for (let i = 2; i <= Math.min(capped.length, 12); i += 1) terms.add(capped.slice(0, i));
  });
  return Array.from(terms).slice(0, MAX_TERMS);
}

function normalizeParticipants(participants = []) {
  return Array.from(new Set((Array.isArray(participants) ? participants : [])
    .map((uid) => cleanStr(uid || '', 160))
    .filter(Boolean)))
    .slice(0, 2);
}

function indexDocRef(ownerUid = '', chatId = '', messageId = '') {
  const safeOwnerUid = cleanStr(ownerUid || '', 160);
  const safeChatId = cleanStr(chatId || '', 220);
  const safeMessageId = cleanStr(messageId || '', 180);
  if (!safeOwnerUid || !safeChatId || !safeMessageId) return null;
  return db.collection('users').doc(safeOwnerUid).collection(SEARCH_INDEX_COLLECTION).doc(`${sha256Hex(`${safeChatId}:${safeMessageId}`).slice(0, 24)}_${safeMessageId.slice(0, 60)}`);
}

function buildIndexPayload({ ownerUid = '', peerUid = '', chatId = '', messageId = '', sender = '', text = '', createdAt = 0, updatedAt = 0 } = {}) {
  const cleanText = cleanStr(text || '', MAX_TEXT_LENGTH);
  const textLower = normalizeSearchText(cleanText);
  return {
    schemaVersion: SEARCH_INDEX_SCHEMA_VERSION,
    ownerUid: cleanStr(ownerUid || '', 160),
    peerUid: cleanStr(peerUid || '', 160),
    chatId: cleanStr(chatId || '', 220),
    messageId: cleanStr(messageId || '', 180),
    sender: cleanStr(sender || '', 160),
    textPreview: cleanText.slice(0, 120),
    textLower,
    terms: tokenizeSearchText(cleanText),
    createdAt: safeNum(createdAt, nowMs()),
    updatedAt: safeNum(updatedAt, nowMs()),
    deleted: false,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  };
}

async function upsertDirectMessageSearchIndex({ chatId = '', messageId = '', participants = [], sender = '', text = '', createdAt = 0, updatedAt = 0 } = {}) {
  const safeChatId = cleanStr(chatId || '', 220);
  const safeMessageId = cleanStr(messageId || '', 180);
  const safeParticipants = normalizeParticipants(participants);
  if (!safeChatId || !safeMessageId || safeParticipants.length < 2) return false;
  const batch = db.batch();
  safeParticipants.forEach((ownerUid) => {
    const ref = indexDocRef(ownerUid, safeChatId, safeMessageId);
    if (!ref) return;
    const peerUid = safeParticipants.find((uid) => uid !== ownerUid) || '';
    batch.set(ref, buildIndexPayload({ ownerUid, peerUid, chatId: safeChatId, messageId: safeMessageId, sender, text, createdAt, updatedAt }), { merge: true });
  });
  await batch.commit();
  return true;
}

async function deleteDirectMessageSearchIndex({ chatId = '', messageId = '', participants = [] } = {}) {
  const safeChatId = cleanStr(chatId || '', 220);
  const safeMessageId = cleanStr(messageId || '', 180);
  const safeParticipants = normalizeParticipants(participants);
  if (!safeChatId || !safeMessageId || !safeParticipants.length) return false;
  const batch = db.batch();
  safeParticipants.forEach((ownerUid) => {
    const ref = indexDocRef(ownerUid, safeChatId, safeMessageId);
    if (ref) batch.delete(ref);
  });
  await batch.commit();
  return true;
}

function parseSearchCursor(cursorData = {}) {
  return {
    createdAt: safeNum(cursorData?.createdAt, 0),
    messageId: cleanStr(cursorData?.messageId || '', 180),
    indexDocId: cleanStr(cursorData?.indexDocId || '', 220)
  };
}

function isAfterCursor(item = {}, cursor = {}) {
  if (!cursor.createdAt) return true;
  const createdAt = safeNum(item.createdAt, 0);
  if (createdAt < cursor.createdAt) return true;
  if (createdAt > cursor.createdAt) return false;
  if (!cursor.messageId) return false;
  return String(item.messageId || '') < cursor.messageId;
}

async function queryDirectMessageSearchIndex({ ownerUid = '', query = '', targetUid = '', limit = 30, cursorData = null } = {}) {
  const safeOwnerUid = cleanStr(ownerUid || '', 160);
  const safeTargetUid = cleanStr(targetUid || '', 160);
  const normalizedQuery = normalizeSearchText(query || '');
  const tokens = tokenizeSearchText(normalizedQuery);
  const primaryTerm = tokens[0] || '';
  const max = Math.max(1, Math.min(100, Math.floor(safeNum(limit, 30))));
  const cursor = parseSearchCursor(cursorData || {});
  if (!safeOwnerUid || !primaryTerm || normalizedQuery.length < 2) return { items: [], nextCursor: '', indexed: true };

  const snap = await db.collection('users')
    .doc(safeOwnerUid)
    .collection(SEARCH_INDEX_COLLECTION)
    .where('terms', 'array-contains', primaryTerm)
    .limit(Math.max(max * 8, 120))
    .get();

  const items = (snap.docs || [])
    .map((doc) => ({ indexDocId: doc.id, ...(doc.data() || {}) }))
    .filter((item) => !item.deleted)
    .filter((item) => !safeTargetUid || cleanStr(item.peerUid || '', 160) === safeTargetUid)
    .filter((item) => normalizeSearchText(item.textLower || item.textPreview || '').includes(normalizedQuery))
    .filter((item) => isAfterCursor(item, cursor))
    .sort((a, b) => safeNum(b.createdAt, 0) - safeNum(a.createdAt, 0) || String(b.messageId || '').localeCompare(String(a.messageId || '')));

  const pageItems = items.slice(0, max);
  const last = pageItems[pageItems.length - 1] || null;
  const nextCursor = items.length > max && last
    ? Buffer.from(JSON.stringify({ createdAt: safeNum(last.createdAt, 0), messageId: cleanStr(last.messageId || '', 180), indexDocId: cleanStr(last.indexDocId || '', 220) })).toString('base64url')
    : '';

  return {
    items: pageItems.map((item) => ({
      chatId: cleanStr(item.chatId || '', 220),
      peerUid: cleanStr(item.peerUid || '', 160),
      messageId: cleanStr(item.messageId || '', 180),
      text: cleanStr(item.textPreview || '', MAX_TEXT_LENGTH),
      createdAt: safeNum(item.createdAt, 0),
      sender: cleanStr(item.sender || '', 160),
      indexDocId: cleanStr(item.indexDocId || '', 220)
    })),
    nextCursor,
    indexed: true
  };
}

module.exports = {
  SEARCH_INDEX_COLLECTION,
  SEARCH_INDEX_SCHEMA_VERSION,
  normalizeSearchText,
  tokenizeSearchText,
  upsertDirectMessageSearchIndex,
  deleteDirectMessageSearchIndex,
  queryDirectMessageSearchIndex
};
