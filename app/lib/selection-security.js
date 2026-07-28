'use strict';

const crypto = require('node:crypto');

const CHOICE_ORDERS = [ 1, 2, 3 ];
const IDENTIFIER_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const SUBSCRIBE_STATUSES = new Set([ '', 'accept', 'reject', 'ban', 'user_cancel', 'failed' ]);

function isValidIdentifier(value) {
  return typeof value === 'string' && IDENTIFIER_PATTERN.test(value);
}

function normalizeChoices(choices) {
  if (!Array.isArray(choices) || choices.length !== CHOICE_ORDERS.length) {
    return null;
  }
  const normalized = [];
  for (const item of choices) {
    if (!item || typeof item !== 'object') {
      return null;
    }
    const teacherId = typeof item.teacherId === 'string' ? item.teacherId.trim() : '';
    const order = Number(item.order);
    if (!isValidIdentifier(teacherId) || !Number.isInteger(order)) {
      return null;
    }
    normalized.push({ teacherId, order });
  }
  normalized.sort((a, b) => a.order - b.order);
  if (
    normalized.some((item, index) => item.order !== CHOICE_ORDERS[index])
    || new Set(normalized.map(item => item.teacherId)).size !== normalized.length
  ) {
    return null;
  }
  return normalized;
}

function normalizeSubscribeStatus(value) {
  if (value === undefined || value === null) {
    return '';
  }
  return typeof value === 'string' && SUBSCRIBE_STATUSES.has(value) ? value : null;
}

function choiceFingerprint(studentId, activityId, choices) {
  const payload = JSON.stringify({
    activityId: String(activityId),
    choices,
    studentId,
  });
  return crypto.createHash('sha256').update(payload).digest('hex');
}

function isSameChoiceSet(records, choices) {
  if (!Array.isArray(records) || records.length !== choices.length) {
    return false;
  }
  const existing = records
    .map(record => ({ teacherId: record.teacherId, order: Number(record.order) }))
    .sort((a, b) => a.order - b.order);
  return existing.every((item, index) => (
    item.order === choices[index].order
    && item.teacherId === choices[index].teacherId
  ));
}

function teacherWindow(activity, order) {
  const fields = {
    1: [ 'firstChooseStartDate', 'firstChooseEndDate' ],
    2: [ 'secondChooseStartDate', 'secondChooseEndDate' ],
    3: [ 'thirdChooseStartDate', 'thirdChooseEndDate' ],
  }[order];
  if (!fields) {
    return null;
  }
  const start = new Date(activity[fields[0]]);
  const end = new Date(activity[fields[1]]);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }
  return { start, end };
}

function isWithinWindow(now, window) {
  return Boolean(
    now instanceof Date
    && !Number.isNaN(now.getTime())
    && window
    && now >= window.start
    && now <= window.end
  );
}

function isDuplicateKeyError(error) {
  return Boolean(error && (error.code === 11000 || error.code === 11001));
}

module.exports = {
  CHOICE_ORDERS,
  choiceFingerprint,
  isDuplicateKeyError,
  isSameChoiceSet,
  isWithinWindow,
  isValidIdentifier,
  normalizeChoices,
  normalizeSubscribeStatus,
  teacherWindow,
};
